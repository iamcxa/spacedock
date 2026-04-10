---
id: 040
title: "SpaceDock Plugin Architecture v2 — Engine/UI Separation & Cross-Project Distribution"
status: draft
source: "CL Slack request (2026-04-08) + team sharing session feedback"
started:
completed:
verdict:
score: 0.95
worktree:
issue:
pr:
intent: feature
scale: XLarge
project: spacedock
---

## Dependencies

- Subsumes and coordinates: 008, 022, 018, 019
- 032 (SQLite snapshots) should ship first — currently in pr-review

## Context

### CL's Direction (Slack 2026-04-08)

> "can you show me a high level architecture of the spacedock ui/dashboard?"
> - Status script → main CLI entry point: `spacedock`
> - Git subcommand convention: `spacedock dashboard`
> - Existing mod system for pluggability
> - UI functionality componentized through mods?
> - TUI version: `spacedock tui`

### Team Signal (sharing session 2026-04-08)

Even (after 1+ hour follow-up discussion with KC and Andy):
- "It will change how the team works from various perspectives"
- "Humans + agents collaborate seamlessly — gatekeeping and real-time feedback on markdown"
- "**Zero friction to onboard** — just open, read, comment, approve"
- "This can solve Luis's bottleneck: 'It's just me. I have to reach 300 people.'"

Even (architecture思考):
- Split UI and engine
- Add real-time storage to update markdowns
- Deploy UI → everyone can interact
- Engine can be hosted by anyone

### Existing Entity Map

| Entity | Title | Status | Role in v2 |
|--------|-------|--------|-----------|
| 008 | Dashboard Standalone Plugin | plan | **WP1**: Extract dashboard → independent plugin |
| 022 | Workflow Location Architecture | explore | **WP2**: Definition user-scoped, entities project-local |
| 018 | Multi-root Workflow Discovery | explore | **WP3**: Dashboard aggregates across repos |
| 019 | Standalone Binary | explore | **WP4**: bun build --compile for zero-dep distribution |
| (new) | SpaceDock CLI Entry Point | — | **WP5**: `spacedock` command with subcommands |

## Problem Statement

SpaceDock 目前是 monolithic — workflow engine、dashboard UI、skills、agents 全部住在同一個 repo 的同一個 plugin 裡。這造成：

1. **Distribution friction** — 要用 dashboard 就得裝整個 spacedock plugin
2. **Cross-project limitation** — `/build` 只在 spacedock repo 裡能發現 workflow
3. **Runtime coupling** — Python (engine) 和 Bun/TypeScript (dashboard) 混在一起
4. **No CLI story** — 沒有 `spacedock` 命令，只有 skill invocations
5. **No independent release** — dashboard 的 release cadence 被 engine 綁住

## Target Architecture

```
┌─────────────────────────────────────────────────────┐
│  spacedock (core plugin)                            │
│  ─ workflow engine: commission, FO, ensign, refit   │
│  ─ CLI: `spacedock status`, `spacedock commission`  │
│  ─ mod system for extensibility                     │
│  ─ Python + shell, stdlib-only                      │
└──────────────────────┬──────────────────────────────┘
                       │ discovers workflows via
                       │ user-scoped definitions +
                       │ project-local entities
                       │
┌──────────────────────┴──────────────────────────────┐
│  spacedock-dashboard (UI plugin)                    │
│  ─ web dashboard: entity view, activity, comments   │
│  ─ MCP channel: bidirectional FO communication      │
│  ─ gate approval UI                                 │
│  ─ share links                                      │
│  ─ CLI: `spacedock dashboard`, `spacedock tui`      │
│  ─ Bun/TypeScript, npm deps                         │
└─────────────────────────────────────────────────────┘
                       │
         works with ANY spacedock workflow
         in ANY project repo
```

### Workflow File Layout (post-v2)

```
~/.claude/workflows/build-pipeline/    ← definition (user-scoped, shared)
  README.md                            ← stages, schema, profiles
  _mods/

{project_root}/.spacedock/pipeline/    ← entities (project-local, isolated)
  feature-001.md
  feature-002.md
  _archive/
  _logs/
```

## Work Packages

### WP1: Dashboard Plugin Extraction (entity 008)
**Status: plan — ready to execute**
- Extract tools/dashboard/ → standalone spacedock-dashboard plugin
- New plugin.json, .mcp.json with ${CLAUDE_PLUGIN_ROOT}
- Fix 5 cross-reference breakage points
- Skills: /dashboard, /build move to dashboard plugin
- ~40 files touched, 12-task plan already written

### WP2: Workflow Location Split (entity 022)
**Status: explore — needs plan**
- Definition (README.md + _mods/) → ~/.claude/workflows/{name}/
- Entities → {project_root}/.spacedock/{name}/
- Status tool + FO + dashboard all support split paths
- Migration path for existing build-pipeline entities

### WP3: Multi-root Discovery (entity 018)
**Status: explore — needs plan**
- Dashboard aggregates workflows from multiple project roots
- Enables "single dashboard, multiple projects" view
- Depends on WP2's entity location convention

### WP4: Standalone Binary (entity 019)
**Status: explore — nice to have**
- `bun build --compile` for zero-dependency distribution
- Eliminates Bun runtime requirement for end users
- Lower priority — plugin distribution works without this

### WP5: SpaceDock CLI Entry Point (NEW)
**Status: needs entity**
- `spacedock` command (or product name TBD)
- Subcommands: `status`, `commission`, `dashboard`, `tui`
- Built on top of existing status script (Python) + ctl.sh (bash)
- CL specifically asked for this
- Depends on product naming decision

## Execution Order

```
         032 (SQLite snapshots, pr-review)
          │
          ▼
WP1: 008 (plugin extraction)  ←── critical path, unblocks everything
          │
    ┌─────┴─────┐
    ▼           ▼
WP2: 022    WP5: (CLI)  ←── can parallel after WP1
(location)  (new entity)
    │
    ▼
WP3: 018 (multi-root)  ←── depends on WP2
    │
    ▼
WP4: 019 (binary)  ←── nice to have, last
```

## Impact Analysis

### Highest Impact: WP1 (plugin extraction)

**Why this is THE unlock:**

1. **CL 的問題直接回答** — "show me a high level architecture" → 拆完之後架構圖就是 target architecture
2. **Distribution unblocked** — 任何人 `plugin install spacedock-dashboard` 就能用
3. **Independent release** — dashboard 可以每天 ship，不等 engine
4. **Cross-project ready** — plugin 不綁定特定 repo
5. **Even 的 vision enabled** — "deploy UI → everyone can interact"

### Second Impact: WP2 (location split)

**Why this matters:**
- 沒有這個，`/build` 還是只在 spacedock repo 裡能用
- 有了這個，任何 project 都能有自己的 build pipeline entities

### Third Impact: WP5 (CLI)

**Why CL cares:**
- `spacedock dashboard` 比 `/dashboard` skill invocation 更直覺
- 給 SpaceDock 一個 "product feel"，不只是 Claude Code plugin

## Product Naming Context

SpaceDock 是 code name。CL 在 Opportunity 3 列了候選名：
- **Omakase** — "I'll leave it to you." Trust, delegation, quality.
- **Brigade** — Kitchen brigade system. Professional.
- **HackerKitchen** — Builder ethos. CL owns domain. Risk: "hacker" may not land with manager ICP.
- **Mess Hall** — Better as marketplace name.
- **Plate** — Final assembly, presentation.

命名決策影響 WP5 (CLI command name) 和 WP1 (plugin name)。可以先用 spacedock 推進，命名確定後 rename。

## Captain Decisions

1. **Dashboard plugin scope** — 裝在 user scope（`~/.claude/plugins/`），repo scope 也相容
2. **Plugin name** — `spacedock-dashboard`（先跟 008 plan 一致，product name 確定後再 rename）
3. **File-based first** — 不納入 Even 的 real-time storage 想法。SpaceDock 底層維持 file-based markdown，這是核心設計
4. **Execution order** — WP1 (008) 先，plan 已 ready

## Open Questions

1. CLI entry point 要用什麼語言？Python (跟 engine 一致) 還是 shell (薄 wrapper)？
2. Product name 要在什麼時間點決定？影響 plugin name、CLI command、repo name
3. 008 的 plan 需要 review 嗎？還是直接進 execute？
