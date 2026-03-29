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
| **Windsurf** | 5 parallel agents (Feb 2026) | Cascade agent config | Sequential within Cascade flow | Skills via Cascade |
| **OpenCode** | Native subagents, agent teams (Feb 2026) | `.opencode/agents/*.md` or `opencode.json` | Event-driven peer-to-peer messaging | Tab-switch between primary agents |

### Spacedock constructs mapped to equivalents

**Tier 1 — Portable now (phrasing changes only):**
- Tool name references (`Read`, `Write`, `Bash`, `Glob`, `Edit`) — all agents have file/shell equivalents. Fix: use generic language ("read the file").
- `{spacedock_plugin_dir}` template resolution — fix with symlink approach (templates travel with skill directory).
- Git worktree commands — universal shell commands, work everywhere.

**Tier 2 — Portable with adaptation (equivalents exist but differ):**
- `.claude/agents/` agent definitions — Codex uses `~/.codex/agents/*.toml`, Gemini CLI uses `.gemini/agents/*.md`, OpenCode uses `.opencode/agents/*.md`, Copilot uses `.github/copilot/agents/`. The concept is universal; the format and location differ per agent. Commission could generate agent files in the target format.
- Slash command invocation (`/commission`) — Gemini CLI auto-discovers skills via `activate_skill`. Cursor and Copilot load SKILL.md. Most agents now support progressive disclosure (load description first, full content on activation), so large skills are not problematic.

**Tier 3 — Requires target-specific orchestration:**
- `Agent()` subagent spawning with `subagent_type` — all major agents now support subagent spawning, but the API differs. Claude Code uses `Agent(type="first-officer")`, Codex references custom agents by name, Gemini CLI uses `activate_skill` or subagent tools, Copilot uses `task` tool. The dispatch mechanism is the main compile target difference.
- `TeamCreate` / `SendMessage` inter-agent communication — Claude Code's team messaging model is unique. Codex and Copilot use orchestrator-collects-results. OpenCode has event-driven peer-to-peer messaging. Gemini CLI subagents return summaries. The communication model varies most across agents.

### Per-agent assessment (updated)

| Agent | Install works? | Commission skill runs? | Generated workflow runs? | Classification |
|-------|---------------|----------------------|------------------------|----------------|
| Claude Code (no plugin) | Yes | Yes (with Tier 1 fixes) | Yes | REALISTIC — this task (057) |
| Codex | Yes | Likely (with Tier 1+2 fixes) | Yes (with target-specific orchestration) | REALISTIC — via 036 compile target |
| Gemini CLI | Yes | Likely (with Tier 1+2 fixes) | Yes (with target-specific orchestration) | REALISTIC — via 036 compile target |
| GitHub Copilot | Yes | Likely (with Tier 1+2 fixes) | Yes (with target-specific orchestration) | REALISTIC — via 036 compile target |
| Cursor | Yes | Likely (with Tier 1+2 fixes) | Yes (with target-specific orchestration) | REALISTIC — via 036 compile target |
| OpenCode | Yes | Likely (with Tier 1+2 fixes) | Yes (with target-specific orchestration) | REALISTIC — via 036 compile target |
| Windsurf | Yes | Likely (with Tier 1+2 fixes) | Uncertain (Cascade flow differs) | NEEDS INVESTIGATION |

### Key insight: distribution vs. execution (revised)

The previous analysis concluded that cross-agent execution was aspirational because other agents lacked subagent support. **This is no longer true.** As of Feb-Mar 2026, every major coding agent supports some form of subagent spawning and multi-agent orchestration. The gap is no longer "can vs. can't" — it's "how" (different APIs, formats, and communication models).

The skills CLI solves **distribution** universally — `npx skills add` installs to all agents. **Execution** now splits into:

1. **Commission/refit skills** — need Tier 1 fixes to become portable. These are install-time tools that generate files. Most of their logic (creating README, status scripts, entity templates) is agent-agnostic.
2. **Generated workflow runtime** (first-officer/ensign orchestration) — needs Tier 3 adaptation per target. The orchestration pattern (lead agent dispatching workers) is now universal, but the API differs. This is 036's domain: generate the right agent files and dispatch commands for each target.

### Decision

Scope this task (057) to making `npx skills add` work for Claude Code users. The updated research shows that cross-agent *execution* is now realistic (not aspirational) for most agents, but the implementation belongs in task 036 (compile targets), which would generate target-specific orchestration files.

### Impact on task 036

The previous 036 spec proposed three targets: `claude-code`, `codex`, and `portable`. The research suggests more targets are viable: `gemini-cli`, `copilot`, `cursor`, and `opencode` all have subagent systems that could run spacedock workflows. Task 036's scope may expand, or a generic "subagent" target could cover agents with similar patterns.

Key finding for 036: Codex custom agents use TOML files in `~/.codex/agents/`, Gemini CLI uses `.gemini/agents/*.md` with YAML frontmatter, OpenCode uses `.opencode/agents/*.md`, and Copilot uses `.github/copilot/agents/`. The first-officer/ensign templates would need to be compiled into these target-specific formats.

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

Conducted web research (previously missing) on the current multi-agent capabilities of Codex, Gemini CLI, Cursor, GitHub Copilot, Windsurf, and OpenCode. The previous analysis (based on May 2025 knowledge cutoff) incorrectly classified these as single-agent systems — as of Feb-Mar 2026, every major coding agent supports subagent spawning and multi-agent orchestration. This changes the cross-agent per-agent assessment from ASPIRATIONAL to REALISTIC for all major agents (via 036 compile targets). Updated the compatibility table with specific agent file formats (Codex TOML, Gemini `.gemini/agents/*.md`, etc.) and dispatch mechanisms. The 057 scope (distribution only) remains correct, but 036's opportunity is now significantly larger than the original spec anticipated. Also added `mods/` directory to the approach and resolved the 057/036 boundary.
