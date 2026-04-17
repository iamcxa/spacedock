---
id: 126
title: 將 spacedock build-flow 抽取為可攜式 workflow plugin
slug: portable-workflow-plugin
status: draft
context_status: pending
source: /shape
created: 2026-04-16T16:35:00Z
shape_status: validated
intent:
scale:
project: spacedock
---

## Captain Context Snapshot

**Invocation timestamp**: 2026-04-16T16:35:00Z

**Raw directive**: 將 spacedock build-flow 抽取為可攜式 workflow plugin — 通用 know-how stages + per-project YAML config + plugin 安裝路徑 — 讓同一套 flow 能在 recce、carlove 及未來 repo 中直接使用，無需 fork spacedock。

**上游對話 context（Musk-perspective session 2026-04-16/17）**:

- Kent 已在 recce / carlove 多次使用 spacedock build-flow，dogfood 證據充足
- clkao 獨立確認 sharability 是真實問題（Slack 2026-04-16）："sharability is a real problem, but right now I just tell FO to create a concise commission prompt to replicate the workflow"
- clkao 同時點出 plugin 化的三個 load-bearing concerns：(1) maintenance overhead, (2) testability ("how do you test it?"), (3) local update flow ("when you want to update a local workflow")
- Kent 提出結構：xxx-workflow/ 含 skills/ + workflow/ (new) + agents/
- Kent 確認 YAML 作為 config 格式（理由：LLM-friendly，emit/parse error rate 低於 TS config）
- Musk 分析結論：方向正確，但 (a) stage list 由 diet 決定不由 shape 預鎖，(b) YAML config fields 由 dogfood 浮現不由想像設計，(c) build-setup 不命名為 skill — 可能只是 plugin bootstrap 的一行 command
- Q1（entity 125, decouple-ui-plugin）已 ship — spacedock-ui 獨立 repo + CONTRACT.md + verify-contract.sh
- Diet（Idiot Index audit + delete-in-place on build-flow）尚未執行，排在本 shape 之後、build 之前
- 相關但 OUT：Q1 UI 脫耦合（已 ship）、build-flow diet（refactor 非 shape）、sd-ui 新功能

## Problem Statement

The spacedock build pipeline (13 stages, 3 profiles, 45+ entity history) encodes hard-won process knowledge about how to move a feature from directive to shipped code, but that knowledge is trapped inside a single repository. Teams and solo contributors who want to use the same flow in other projects — recce, carlove, or any future repo — face a binary choice: fork spacedock (inheriting 50+ entities of irrelevant history and spacedock-specific wiring) or manually copy-paste workflow prompts into each new project (losing upstream improvements and diverging immediately). Both paths create maintenance burden that scales linearly with the number of consuming projects. This is the classic "good process, bad distribution" problem: the flow works, but its packaging makes it a single-repo artifact when it should be a reusable tool.

## User Stories

- **US-1**: As Kent (flow author), I want to publish the build-flow as an installable plugin with a versioned release channel, so that consuming projects (recce, carlove) can pull upstream improvements without manually copying prompt files.
- **US-2**: As Kent (consumer in recce/carlove), I want to supply a per-project YAML config that overrides stage selection and tuning parameters after the diet determines the applicable stage list, so that each project's pipeline reflects its actual workflow without forking the canonical plugin.
- **US-3**: As clkao (CTO evaluating adoptability), I want the plugin to ship with a replay-and-diff test harness that validates the workflow contract against fixture inputs without requiring a live Claude session, so that I can verify correctness and catch regressions before recommending the plugin to other teams.
- **US-4**: As clkao (CTO evaluating adoptability), I want a documented contribution path where a downstream project's workflow improvement can be proposed back to the canonical plugin as a pull request, so that the maintenance burden does not concentrate on a single author and improvements flow both directions.
- **US-5**: As a future team member installing the plugin for the first time, I want a single installation command that registers the plugin in my repo and seeds a minimal project config, so that I reach a working pipeline without reading spacedock internals or inheriting its entity history.

## Scope: In

- A standalone installable plugin package (skills/ + workflow/ + agents/ organizational shape) that wraps the existing build-flow without forking spacedock's entity history or spacedock-specific wiring
- A versioned release channel mechanism (e.g., git tag + install instructions) enabling consuming projects (recce, carlove) to pin and pull upstream improvements
- A bootstrap capability that, on first install, seeds a minimal per-project config file in the consuming repo (exact command name and config file format deferred to dogfood; capability = "one command → working pipeline with project-local overrides")
- A documented contribution path (CONTRIBUTING.md or equivalent) describing how a downstream project's workflow improvement can be proposed back to the canonical plugin as a pull request, including branch conventions, fixture update requirements, and review expectations
- A README-level install guide covering: install command, config seed step, and first-run verification

## Scope: Phase 2 (post first dogfood install in recce)

*Deferred by Musk Step 5.5 pressure test — these items need dogfood evidence before specifying.*

- Per-project YAML config override support: config schema fields derived from actual recce/carlove override-wishlist, not designed upfront (satisfies US-2 post-evidence)
- Replay-and-diff test harness: contract surface confirmed by dogfood before writing fixtures (satisfies US-3 post-evidence)

## Scope: Out

- Build-flow diet (Idiot Index audit + delete-in-place) — prerequisite work that determines which stages survive into the plugin; this shape packages what diet produces, not the diet itself
- spacedock-ui plugin (entity 125, already shipped) — separate concern; dashboard and visualization features do not belong to the distributable flow plugin
- New stage creation or stage redesign — this shape packages the existing post-diet stages as-is; no new pipeline stages are introduced here
- Multi-provider orchestration extensions (Codex officer, parallel model dispatch, etc.) — mentioned as future direction but not required to satisfy any of the five user stories at MVP
- Dashboard / visualization / UI features — belong to spacedock-ui plugin; the distributable flow plugin is headless
- SaaS / hosted / multi-tenant deployment — solo-broadcaster scope only; no auth layer, no account system, no team provisioning
- Spacedock entity history or build-pipeline backlog migration — consuming projects start fresh; importing 45+ spacedock entities is explicitly not part of install
- Plugin marketplace or automated registry — distribution is git-tag + documented install command; no registry infrastructure in scope

## References

- `skills/build-shape/SKILL.md` — shape skill definition (Step 5.5 pressure test where Musk perspective was applied)
- `spacebridge/` — current build-flow location (skills/ + agents/ + workflow definitions embedded in spacedock)
- `spacedock-ui/` (entity 125, shipped) — proven pattern for plugin extraction + CONTRACT.md
- Slack thread 2026-04-16 (Kent + clkao): "workflows like a thin plugin with the current workflow as meta"; clkao: "sharability is a real problem"; clkao: "how do you test it? awkward for maintaining that plugin when you want to update a local workflow"
- Kent's proposed structure: `xxx-workflow/ { skills/, workflow/, agents/ }`
- Musk-perspective session 2026-04-16/17: full decomposition of spacedock + spacebridge → Q1 (UI decouple) + Q2 (workflow plugin) + diet (refactor)

## Stage Report: shape

- **Directive**: 將 spacedock build-flow 抽取為可攜式 workflow plugin
- **Subagent dispatches**: framer (3 candidates), story-gen (5 stories), scope-drafter (7 In / 9 Out bullets)
- **Captain accepts**: Problem Statement = Candidate A (fork-or-copy tax); User Stories = all 5 accepted; Scope In = 5 bullets (original 7 pruned to 5 by Musk Step 5.5 pressure test — per-project config and test harness deferred to Phase 2 post-dogfood); Scope Out = 8 bullets accepted as-is
- **Pressure test (Step 5.5)**: Goal confirmed (flow portability); Gap confirmed (diet + extraction + test); Musk逆向思考 pruned 2 bullets as premature optimization — config fields need dogfood evidence, test harness needs real contract surface. Captain accepted.
- **Captain meta-feedback**: build-shape skill 的 Step 5.5 應加入 Musk 逆向思考作為常態化 pressure test（recorded as follow-up, not in this entity's scope）
- **Final story count**: 5 (US-2 and US-3 deferred to Phase 2 delivery, retained in stories as target intent)
