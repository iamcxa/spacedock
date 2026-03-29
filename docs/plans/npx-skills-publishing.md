---
id: 057
title: Publish spacedock via npx skills ecosystem
status: ideation
source: CL
started: 2026-03-27T23:45:00Z
completed:
verdict:
score:
worktree:
---

Make spacedock installable via `npx skills add clkao/spacedock` — the Vercel Labs `skills` CLI. This is the dominant distribution channel for Claude Code skills and supports 40+ coding agents.

## Problem statement

Spacedock currently distributes via `claude plugin marketplace add clkao/spacedock`. This only works for Claude Code users. The Vercel Labs `skills` CLI (`npx skills add`) supports 40+ coding agents (Claude Code, Cursor, Codex, OpenCode, Windsurf, Gemini CLI, GitHub Copilot, etc.) and is the dominant distribution channel for agent skills. Supporting it would dramatically expand spacedock's reach.

However, spacedock is more than just skill files. The commission and refit skills depend on template files (`templates/`) that they copy into the user's project at runtime. A naive skills-CLI install would only copy the SKILL.md files, losing access to the templates — making the skills non-functional.

## Research findings

### 1. How the skills CLI works

**Source resolution:** `npx skills add clkao/spacedock` parses `clkao/spacedock` as GitHub shorthand, constructing `https://github.com/clkao/spacedock.git`. It also supports full URLs, GitLab, local paths, and `@skill` syntax for single-skill installs. (Source: `src/source-parser.ts`)

**Cloning:** The CLI does a shallow clone (`--depth 1`) of the repo into a temp directory. (Source: `src/git.ts`)

**Skill discovery:** It searches well-known directories in order: `skills/`, `.claude/skills/`, `.agents/skills/`, and many agent-specific paths. It also reads `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json` for declared skill paths. Each skill is a directory containing a `SKILL.md` file with `name` and `description` in YAML frontmatter. (Source: `src/skills.ts`, `src/plugin-manifest.ts`)

**Installation:** For each discovered skill, the CLI copies the entire skill **directory** (not just the SKILL.md) to the canonical location `.agents/skills/<skill-name>/` and creates symlinks for each target agent (e.g., `.claude/skills/<skill-name>/`). Files starting with `.` and directories like `.git` are excluded. (Source: `src/installer.ts`, `copyDirectory()`)

**Key finding: directory copy, not file copy.** The installer copies the entire directory tree under each skill directory. This means auxiliary files alongside SKILL.md are preserved.

**Plugin manifest support:** The skills CLI reads `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` to discover additional skill paths. Spacedock already has these files, and the skills CLI will use them to find `skills/commission/` and `skills/refit/`. (Source: `src/plugin-manifest.ts`)

### 2. Spacedock's plugin structure

Spacedock ships these components:

| Component | Path | Purpose |
|-----------|------|---------|
| Commission skill | `skills/commission/SKILL.md` | Interactive workflow design (20K lines) |
| Refit skill | `skills/refit/SKILL.md` | Upgrade workflow scaffolding (13K lines) |
| First-officer template | `templates/first-officer.md` | Agent that orchestrates the workflow |
| Ensign template | `templates/ensign.md` | Worker agent for stage execution |
| Validator template | `templates/validator.md` | Validation agent |
| PR-lieutenant template | `templates/pr-lieutenant.md` | PR workflow agent |
| Status template | `templates/status` | Bash script for workflow status views |
| Plugin manifest | `.claude-plugin/plugin.json` | Plugin metadata (version, name) |
| Marketplace manifest | `.claude-plugin/marketplace.json` | Marketplace catalog entry |

**Template dependency:** Both skills reference `{spacedock_plugin_dir}/templates/` at runtime. The commission skill copies templates into the user's project during workflow generation. The refit skill compares existing agent files against templates to detect drift. Without access to the `templates/` directory, both skills are non-functional.

### 3. Compatibility assessment: skills CLI vs. plugin marketplace

**They can coexist.** The two systems install to different locations and serve different purposes:

- **Plugin marketplace** (`claude plugin marketplace add`): Installs the entire repo as a plugin. Claude Code resolves the plugin directory at runtime, giving skills access to sibling directories like `templates/`. The `{spacedock_plugin_dir}` reference works because Claude Code knows the plugin root.

- **Skills CLI** (`npx skills add`): Copies individual skill directories to `.claude/skills/` (or agent-equivalent). Skills are standalone — they have no knowledge of a "plugin root" or sibling directories.

**The gap:** When installed via the skills CLI, the commission and refit skills would be copied to `.claude/skills/commission/` and `.claude/skills/refit/`. They would reference `{spacedock_plugin_dir}/templates/first-officer.md`, but there would be no `spacedock_plugin_dir` — the templates directory wouldn't exist.

### 4. Options analysis

**Option A: Embed templates in skill directories.** Copy each template file into the skill directory (e.g., `skills/commission/templates/first-officer.md`). Update skill prompts to reference `templates/` relative to the skill directory itself rather than the plugin root. The skills CLI copies the entire directory, so templates travel with the skill.

- Pro: Works with the skills CLI as-is. No duplication at install time — each skill carries exactly what it needs.
- Con: Templates would be duplicated across commission and refit skill directories in the repo. Both skills reference the same template files. A build/copy step or symlinks within the repo could solve this.
- Con: Updating templates requires updating them in multiple places (or maintaining the build step).

**Option B: Flatten templates alongside SKILL.md.** Put template files directly in each skill directory (not in a subdirectory).

- Pro: Simplest structure.
- Con: Namespace collision risk. Template filenames like `first-officer.md` alongside `SKILL.md` is messy.

**Option C: Keep plugin-only distribution.** Don't support skills CLI — keep requiring `claude plugin marketplace add`.

- Pro: No changes needed.
- Con: Limits distribution to Claude Code users only.

**Option D: Build step that assembles skill packages.** A script that copies templates into skill directories before publishing. The repo source of truth stays in `templates/`, but a `scripts/build-skills.sh` assembles self-contained skill directories for distribution.

- Pro: Clean source repo, self-contained skills for distribution.
- Con: Adds build complexity. The skills CLI clones the repo directly — it would need the built artifacts committed, or we'd need a separate distribution branch.

## Proposed approach

**Option A with symlinks in the repo.** This is the simplest approach that works:

1. **Add `templates/` and `mods/` symlinks inside each skill directory** pointing to the repo root:
   - `skills/commission/templates` -> `../../templates`
   - `skills/commission/mods` -> `../../mods`
   - `skills/refit/templates` -> `../../templates`
   - `skills/refit/mods` -> `../../mods`

2. **Update skill prompts** to reference templates and mods relative to the skill's own directory:
   - Change `{spacedock_plugin_dir}/templates/first-officer.md` to reference templates relative to the skill file location
   - The skills CLI's `copyDirectory()` uses `dereference: true` when copying files (and `cp` with `dereference: true` for symlinks), so symlinks to templates will be resolved and the actual files will be copied to the install destination

3. **Update plugin.json references** if needed for the marketplace flow to remain compatible.

4. **Both distribution methods work:**
   - Plugin marketplace: Skills find templates via the plugin directory (existing behavior still works, since the symlinks resolve within the repo)
   - Skills CLI: Templates are copied alongside each SKILL.md into `.claude/skills/commission/templates/` etc.

**Why not a build step (Option D)?** The skills CLI clones the repo directly from GitHub. It doesn't run any build commands. So built artifacts would need to be committed to the repo or on a separate branch, which adds maintenance overhead. Symlinks are cleaner — they work at the source level and the CLI's `dereference: true` handles them correctly.

**What about skill prompt references to `{spacedock_plugin_dir}`?** Both skills use this placeholder when referencing templates. This needs to change to something that works in both contexts:
- In plugin mode, the skill knows its own directory. Templates are at `./templates/` relative to the skill.
- In skills-CLI mode, templates are also at `./templates/` relative to the installed skill directory (because the CLI copied/dereferenced them).

The prompt change is: replace all `{spacedock_plugin_dir}/templates/` references with a path relative to the skill's own location. This is the key change that makes both distribution methods work with a single skill file.

**Plugin version detection (refit):** The refit skill reads `.claude-plugin/plugin.json` for the spacedock version. When installed via skills CLI, this file won't exist. The skill should fall back to reading a version from its own frontmatter or a version file within its directory. Adding a `version` field to the SKILL.md frontmatter or a `VERSION` file alongside it would solve this.

## Acceptance criteria

1. `npx skills add clkao/spacedock --list` shows both `commission` and `refit` skills
2. `npx skills add clkao/spacedock -a claude-code` installs both skills to `.agents/skills/` with symlinks to `.claude/skills/`
3. After skills-CLI install, `/commission` generates a working workflow (templates and mods are accessible)
4. After skills-CLI install, `/refit` can detect and upgrade workflow scaffolding (templates and mods are accessible)
5. `claude plugin marketplace add clkao/spacedock` continues to work (no regression)
6. Template files exist in the installed skill directories (e.g., `.agents/skills/commission/templates/first-officer.md`)
7. Mod files exist in the installed skill directories (e.g., `.agents/skills/commission/mods/pr-merge.md`)
8. The spacedock version is accessible to the refit skill regardless of install method

### Out of scope (deferred to task 036)

- Cross-agent execution (making generated workflows run on Codex, Gemini CLI, Copilot, Cursor, OpenCode, Windsurf)
- `--target` parameter for commission
- Tier 2/3 portability: target-specific agent file formats (TOML for Codex, `.gemini/agents/*.md` for Gemini, etc.) and dispatch mechanism adaptation
- Note: cross-agent execution is now classified REALISTIC (not aspirational) — all major agents gained subagent support in early 2026

## Relationship with task 036 (compile targets)

Task 036 proposes treating commission as a compiler with `--target` (claude-code, codex, portable). Task 057 is about **distribution** — how spacedock gets installed. These operate at different layers:

- **057 (this task):** Makes spacedock installable via `npx skills add`. The skill files need to be self-contained (templates bundled). This is target-agnostic — the symlink/embed approach works regardless of what commission generates.
- **036 (compile targets):** Changes what commission *outputs* per platform. A `--target codex` would generate `AGENTS.md` instead of `.claude/agents/`. A `--target portable` would generate only README + status (no agent files).

**Key insight:** 036 subsumes 057's cross-agent *execution* concerns. The cross-agent compatibility analysis (updated via web research, March 2026) found that all major coding agents now support subagent spawning and multi-agent orchestration — cross-agent execution is realistic, not aspirational. However, the orchestration APIs differ per agent (Codex uses TOML agent files, Gemini CLI uses `.gemini/agents/*.md`, etc.). Task 036 solves this by generating platform-native orchestration. So 057 should **not** attempt cross-agent execution fixes — it should only make the skill files installable.

**What 057 owns:** Making `npx skills add clkao/spacedock` work for Claude Code users. Templates travel with skills, `{spacedock_plugin_dir}` references become relative, version detection works without plugin manifest.

**What 036 owns:** Making commission generate output that runs on non-Claude-Code agents. This is now a more tractable problem than previously assumed — the target agents have real subagent systems, so 036 needs to compile to their specific formats rather than invent a workaround for missing capabilities.

**No blocking dependency:** 057 can be implemented before 036 exists. The symlink approach is additive — it doesn't change the commission output format, just how the skill files locate their assets.

## Open questions

1. **Symlink deref verification:** The skills CLI `copyDirectory()` uses `dereference: true` on individual file copies, but does it follow directory symlinks when iterating with `readdir`? Need to verify that `skills/commission/templates/` (a symlink to `../../templates/`) is traversed during copy. The `readdir` uses `withFileTypes` and filters `entry.isDirectory()` — need to confirm this returns true for symlinked directories. If not, actual directories with copies may be needed instead.

   **Mitigation if symlinks don't work:** Use a build script (`scripts/build-skills.sh`) that copies `templates/` into each skill directory before publishing. The built artifacts would be committed to the repo. This is Option D from the analysis — less clean but guaranteed to work. A lightweight alternative: commit actual directory copies (not symlinks) and use a CI check to ensure they stay in sync with `templates/`.

2. **Skill prompt self-location:** How does a skill installed via the skills CLI know its own directory path? If the agent presents skills by injecting their content into the system prompt, the skill has no way to know its filesystem location. This may require the skill to use a known install path (`.agents/skills/commission/templates/`) instead of a relative reference. Needs investigation.

   **Note:** This question applies to both `templates/` and `mods/` references. The `{spacedock_plugin_dir}` placeholder is resolved by Claude Code's plugin system. When installed via skills CLI, there is no plugin system — the skill is just a markdown file injected into context. The replacement mechanism needs to work without plugin-level path resolution.

3. **Mods directory:** The current ideation focuses on `templates/` but both skills also reference `{spacedock_plugin_dir}/mods/`. The same symlink/embed approach applies: add `mods/` symlinks in each skill directory. This should be called out in the implementation plan.

## Cross-agent compatibility analysis

*Updated 2026-03-28 with web research. The previous analysis (based on May 2025 knowledge cutoff) incorrectly classified Codex, Gemini CLI, and OpenCode as single-agent systems. As of early 2026, the multi-agent landscape has shifted substantially.*

### Agent multi-agent capabilities (as of March 2026)

| Agent | Subagent spawning | Agent definitions | Inter-agent comms | Skill activation |
|-------|------------------|-------------------|-------------------|-----------------|
| **Claude Code** | Agent tool, TeamCreate | `.claude/agents/*.md` | SendMessage (team messaging) | `/slash` on-demand |
| **Codex** | Native subagents (Feb 2026), `agents.max_depth` config | `~/.codex/agents/*.toml` (custom agents) | Orchestrator collects results | Skills via SKILL.md |
| **Gemini CLI** | Experimental subagents, `activate_skill` tool | `.gemini/agents/*.md` with YAML frontmatter | Subagent returns summary to parent | `activate_skill` auto-discovery |
| **Cursor** | Subagents (v2.4, Jan 2026), orchestrator-worker pattern | Custom subagent definitions | Lead agent aggregates results | SKILL.md auto-discovery |
| **GitHub Copilot** | Fleet mode (parallel subagents), `read_agent`/`task` tools | Custom agents via `.github/copilot/agents/` | Subagent results to orchestrator | SKILL.md, AGENTS.md |
| **Windsurf** | Parallel Cascade sessions via git worktrees (Wave 13) | Cascade config (no file-based agent defs) | No inter-session communication | Skills via Cascade |
| **OpenCode** | Native subagents, agent teams (Feb 2026) | `.opencode/agents/*.md` or `opencode.json` | Event-driven peer-to-peer messaging | Tab-switch between primary agents |

### Spacedock constructs mapped to equivalents

**Tier 1 — Portable now (phrasing changes only):**
- Tool name references (`Read`, `Write`, `Bash`, `Glob`, `Edit`) — all agents have file/shell equivalents. Fix: use generic language ("read the file").
- `{spacedock_plugin_dir}` template resolution — fix with symlink approach (templates travel with skill directory).
- Git worktree commands — universal shell commands, work everywhere. Windsurf Wave 13 added explicit git worktree support; Copilot community is experimenting with worktree-based subagent isolation.

**Tier 2 — Portable with adaptation (equivalents exist but differ):**
- `.claude/agents/` agent definitions — every major agent now has an equivalent location and format:

  | Agent | Agent file location | Format |
  |-------|-------------------|--------|
  | Claude Code | `.claude/agents/*.md` | Markdown with custom instructions |
  | Codex | `~/.codex/agents/*.toml` | TOML with model, sandbox, MCP config |
  | Gemini CLI | `.gemini/agents/*.md` | Markdown with YAML frontmatter |
  | Cursor | `.cursor/agents/*.md` | Markdown with YAML frontmatter (name, description, model, readonly, is_background) |
  | GitHub Copilot | `.github/copilot/agents/` | Custom agents; also reads AGENTS.md and CLAUDE.md |
  | OpenCode | `.opencode/agents/*.md` or `opencode.json` | Markdown (filename = agent name) or JSON config |
  | Windsurf | Cascade config | Not file-based agent definitions (yet) |

- Slash command invocation (`/commission`) — Gemini CLI auto-discovers skills via `activate_skill` with progressive disclosure (frontmatter only until activated). Cursor and Copilot load SKILL.md. Codex supports skills via SKILL.md. Most agents now support on-demand activation, so large skills are not problematic.

**Tier 3 — Requires target-specific orchestration:**

These are the constructs spacedock's *generated workflow runtime* depends on. Each has equivalents, but the API and communication model differ per agent.

- **`Agent()` subagent spawning with `subagent_type`** — spacedock's first-officer dispatches ensigns via `Agent(type="ensign")`. Equivalents:

  | Agent | Dispatch mechanism | Named agent support |
  |-------|--------------------|-------------------|
  | Claude Code | `Agent(type="ensign")` tool | Yes — `.claude/agents/ensign.md` |
  | Codex | Reference custom agent by name in prompt; orchestrator spawns | Yes — `~/.codex/agents/*.toml`, also per-repo `.agents/` proposed |
  | Gemini CLI | Subagents exposed as tools of same name; `@agent_name` explicit dispatch | Yes — `.gemini/agents/*.md` |
  | Cursor | Task tool spawns subagent; custom agents via `.cursor/agents/` | Yes — recursive spawning supported (v2.5) |
  | GitHub Copilot | `task` tool or `/fleet` for parallel dispatch; `@CUSTOM-AGENT-NAME` | Yes — custom agents as subagents (GA Mar 2026) |
  | OpenCode | Subagents via config; agent teams via ensemble plugin | Yes — `.opencode/agents/*.md` |
  | Windsurf | Parallel Cascade sessions via git worktrees (Wave 13) | No named agent dispatch — parallel sessions are independent |

- **`TeamCreate` / `SendMessage` inter-agent communication** — spacedock's first-officer creates a team and sends messages to ensigns. This is the construct with the most variation:

  | Agent | Communication model | Closest equivalent |
  |-------|--------------------|--------------------|
  | Claude Code | `TeamCreate` + `SendMessage` peer-to-peer; shared `TaskList` | Native — this is the source construct |
  | Codex | Orchestrator collects results from subagents; no direct peer messaging. MCP + Agents SDK enables hand-offs via shared artifacts (`REQUIREMENTS.md`, `AGENT_TASKS.md`) | Orchestrator-collects pattern; no `SendMessage` equivalent |
  | Gemini CLI | Subagent returns summary to parent; A2A protocol for remote agents; internal MessageBus migration in progress | Return-to-parent; no peer messaging between subagents |
  | Cursor | Lead agent aggregates subagent results; async background agents (v2.5) | Orchestrator-collects; no peer messaging |
  | GitHub Copilot | Fleet mode: orchestrator dispatches and collects; `/tasks` view for monitoring | Orchestrator-collects; no peer messaging |
  | OpenCode | Event-driven peer-to-peer messaging (rebuilt Claude Code's model); append-only JSONL inboxes | **Closest match** — has `SendMessage` equivalent with peer-to-peer |
  | Windsurf | Independent parallel sessions; no inter-session communication | No equivalent — sessions are isolated |

- **`TaskCreate` / `TaskUpdate` shared task tracking** — spacedock uses shared task lists for coordination:

  | Agent | Task tracking |
  |-------|--------------|
  | Claude Code | `TaskCreate`/`TaskUpdate` shared across team | Native |
  | Codex | CSV-based batch orchestration (`spawn_agents_on_csv`, `report_agent_job_result`) | Batch-oriented, not real-time task board |
  | Gemini CLI | No shared task primitive | None |
  | Cursor | No shared task primitive (session-scoped) | None |
  | GitHub Copilot | `/tasks` view shows subagent status | Read-only monitoring, not shared mutable state |
  | OpenCode | Shared task board via ensemble plugin | **Closest match** |
  | Windsurf | Cascade internal Todo list | Single-agent only |

### Communication model implications for 036

The research reveals **three distinct orchestration patterns** across agents, which suggests 036 might target patterns rather than individual agents:

1. **Team messaging** (Claude Code, OpenCode): Peer-to-peer `SendMessage`, shared task lists. The first-officer can send work to specific ensigns and receive updates. This is spacedock's native model.

2. **Orchestrator-collects** (Codex, Gemini CLI, Cursor, Copilot): The lead agent spawns workers and collects results. No direct worker-to-worker communication. The first-officer would need to be restructured as a sequential orchestrator that dispatches one ensign at a time (or in parallel batches) and collects results rather than using message passing.

3. **Independent sessions** (Windsurf): Parallel sessions with no coordination primitive. The first-officer pattern doesn't map well. Workflows would need to be manually coordinated or use filesystem-as-state (shared files for communication).

### Per-agent assessment (updated)

| Agent | Install works? | Commission skill runs? | Generated workflow runs? | Classification |
|-------|---------------|----------------------|------------------------|----------------|
| Claude Code (no plugin) | Yes | Yes (with Tier 1 fixes) | Yes | REALISTIC — this task (057) |
| Codex | Yes | Likely (with Tier 1+2 fixes) | Yes (with target-specific orchestration) | REALISTIC — via 036 compile target |
| Gemini CLI | Yes | Likely (with Tier 1+2 fixes) | Yes (with target-specific orchestration) | REALISTIC — via 036 compile target |
| GitHub Copilot | Yes | Likely (with Tier 1+2 fixes) | Yes (with target-specific orchestration) | REALISTIC — via 036 compile target |
| Cursor | Yes | Likely (with Tier 1+2 fixes) | Yes (with target-specific orchestration) | REALISTIC — via 036 compile target |
| OpenCode | Yes | Likely (with Tier 1+2 fixes) | Yes (with target-specific orchestration) | REALISTIC — via 036 compile target |
| Windsurf | Yes | Likely (with Tier 1+2 fixes) | No (no inter-session comms) | REALISTIC — portable target only (via 036) |

### Key insight: distribution vs. execution (revised)

The previous analysis concluded that cross-agent execution was aspirational because other agents lacked subagent support. **This is no longer true.** As of Feb-Mar 2026, every major coding agent supports some form of subagent spawning and multi-agent orchestration. The gap is no longer "can vs. can't" — it's "how" (different APIs, formats, and communication models).

The skills CLI solves **distribution** universally — `npx skills add` installs to all agents. **Execution** now splits into:

1. **Commission/refit skills** — need Tier 1 fixes to become portable. These are install-time tools that generate files. Most of their logic (creating README, status scripts, entity templates) is agent-agnostic.
2. **Generated workflow runtime** (first-officer/ensign orchestration) — needs Tier 3 adaptation per target. The orchestration pattern (lead agent dispatching workers) is now universal, but the API differs. This is 036's domain: generate the right agent files and dispatch commands for each target.

### Decision

Scope this task (057) to making `npx skills add` work for Claude Code users. The updated research shows that cross-agent *execution* is now realistic (not aspirational) for most agents, but the implementation belongs in task 036 (compile targets), which would generate target-specific orchestration files.

### Impact on task 036

The previous 036 spec proposed three targets: `claude-code`, `codex`, and `portable`. The research suggests a pattern-based approach may be more effective than per-agent targets:

| Target pattern | Agents | Orchestration model | Agent file format |
|---------------|--------|--------------------|--------------------|
| **team-messaging** | Claude Code, OpenCode | Peer-to-peer SendMessage, shared tasks | `.claude/agents/*.md`, `.opencode/agents/*.md` |
| **orchestrator-collects** | Codex, Gemini CLI, Cursor, Copilot | Lead spawns workers, collects results | TOML/MD varies per agent |
| **portable** | Windsurf, any agent | No orchestration — manual or filesystem-as-state | README + status script only |

Key findings for 036:
- **Agent file formats differ but are all markdown or config-based.** The first-officer/ensign templates would need format adapters, not complete rewrites. Gemini CLI, Cursor, OpenCode, and Copilot all use markdown with YAML frontmatter — only Codex uses TOML.
- **The communication model is the real compile-target differentiator**, not the agent file format. The first-officer's dispatch logic (TeamCreate + SendMessage) needs to be rewritten as orchestrator-collects for Codex/Gemini/Cursor/Copilot targets.
- **OpenCode is the closest to Claude Code** — it rebuilt the agent-team system with event-driven peer-to-peer messaging. A `team-messaging` target could cover both with minimal adaptation.
- **Windsurf's Wave 13 parallel sessions lack inter-agent communication**, so it falls into the `portable` category for now.

## Stage Report: ideation

- [x] Relationship between 057 (distribution via npx-skills) and 036 (compile targets) clarified
  057 owns distribution (install path), 036 owns cross-agent execution (compile targets). No blocking dependency — 057 can ship first.
- [x] Proposed approach updated if 036's compile-target model changes the design
  036 does not change 057's design. Symlink approach is additive and target-agnostic. Approach updated to include `mods/` directory.
- [x] Open questions resolved or escalated
  Q1 (symlink deref): unresolved, mitigation documented. Q2 (self-location): unresolved, affects mods too. Q3 (mods): new, addressed in approach.
- [x] Acceptance criteria updated if scope changed
  Added mods criteria, out-of-scope section. Updated cross-agent classification from ASPIRATIONAL to REALISTIC based on web research.
- [x] Clear definition of what's in-scope vs deferred to 036
  In-scope: npx-skills install for Claude Code. Deferred: cross-agent execution (now realistic, not aspirational — all major agents gained subagent support in early 2026).

### Summary

Conducted web research on multi-agent capabilities (subagent spawning, agent file formats, inter-agent communication, task tracking) across Codex, Gemini CLI, Cursor, GitHub Copilot, Windsurf, and OpenCode. The previous analysis (May 2025 cutoff) was substantially wrong: all major agents now support subagent spawning and most support named agent definitions.

Key findings for construct-level compatibility:
- **Agent file definitions:** Universal concept, format varies (Codex TOML, Gemini/Cursor/OpenCode markdown+YAML, Copilot has its own format). Commission can generate target-specific agent files.
- **Subagent dispatch:** All agents support named-agent dispatch. APIs differ but the pattern (lead dispatches worker by name) is universal.
- **Inter-agent communication:** The biggest differentiator. Three patterns emerged: (1) team-messaging (Claude Code, OpenCode), (2) orchestrator-collects (Codex, Gemini, Cursor, Copilot), (3) independent sessions (Windsurf). This is the primary compile-target axis for 036.
- **Task tracking:** Only Claude Code and OpenCode have shared mutable task boards. Others use orchestrator monitoring or no equivalent.

Proposed that 036 target *communication patterns* rather than individual agents — this would reduce the target matrix from 7+ agents to 3 patterns (team-messaging, orchestrator-collects, portable).
