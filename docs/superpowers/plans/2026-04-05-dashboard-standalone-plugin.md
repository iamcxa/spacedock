# Dashboard Standalone Plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the Spacedock dashboard (`tools/dashboard/`) into a standalone Claude Code plugin (`spacedock-dashboard`) that can be installed, versioned, and released independently from the spacedock core workflow engine.

**Architecture:** The dashboard source (`tools/dashboard/src/`, `tools/dashboard/static/`) moves to the plugin root (`src/`, `static/`). A new `.claude-plugin/plugin.json` provides the plugin manifest. The `.mcp.json` registers the channel server using `${CLAUDE_PLUGIN_ROOT}`. The `/dashboard` and `/build` skills move into the new plugin. Tests relocate to a top-level `tests/` directory. The `ctl.sh` daemon manager rewrites its path resolution to use `${CLAUDE_PLUGIN_ROOT}` (MCP context) with `BASH_SOURCE[0]` fallback (skill context). The spacedock core plugin's `references/first-officer-shared-core.md` is updated to use a portable dashboard lookup instead of a hardcoded path.

**Tech Stack:** Bun (runtime + test runner), TypeScript, bash (ctl.sh), Claude Code plugin system (plugin.json, .mcp.json, SKILL.md)

**Research corrections incorporated:**
1. SKILL.md path resolution uses `${CLAUDE_SKILL_DIR}/../../ctl.sh` (NOT `${CLAUDE_PLUGIN_ROOT}/ctl.sh`) -- `${CLAUDE_PLUGIN_ROOT}` does not reliably expand in SKILL.md text
2. No automatic post-install hook -- must bundle `node_modules/` for marketplace distribution, document `bun install` for local development
3. `${CLAUDE_PLUGIN_ROOT}` does NOT expand in agent markdown files (Claude Code issue #9354) -- not needed here but informs design decisions

**Acceptance criteria contradiction resolved:** The entity spec says "Build skill references (first-officer-shared-core.md, ensign-shared-core.md, etc.) relocated into dashboard plugin's references/". However, first-officer-shared-core.md and ensign-shared-core.md are loaded by the FO and ensign skills which STAY in spacedock core -- relocating them would break the core plugin. The plan interprets this as: the `/build` skill moves to the dashboard plugin (it has no reference file dependencies of its own), and the build-pipeline workflow directory moves ownership to the dashboard plugin. The core reference files stay in spacedock core where the FO and ensign need them.

---

## File Structure

### New plugin root (standalone `spacedock-dashboard/` directory)

```
spacedock-dashboard/
  .claude-plugin/
    plugin.json              # NEW: plugin manifest
  .mcp.json                  # NEW: MCP channel server registration
  src/
    server.ts                # MOVE from tools/dashboard/src/
    channel.ts               # MOVE from tools/dashboard/src/
    discovery.ts             # MOVE from tools/dashboard/src/
    api.ts                   # MOVE from tools/dashboard/src/
    events.ts                # MOVE from tools/dashboard/src/
    frontmatter-io.ts        # MOVE from tools/dashboard/src/
    parsing.ts               # MOVE from tools/dashboard/src/
    telemetry.ts             # MOVE from tools/dashboard/src/
    types.ts                 # MOVE from tools/dashboard/src/
    discovery.test.ts        # MOVE from tools/dashboard/src/ (co-located test)
  static/
    index.html               # MOVE from tools/dashboard/static/
    detail.html              # MOVE from tools/dashboard/static/
    app.js                   # MOVE from tools/dashboard/static/
    activity.js              # MOVE from tools/dashboard/static/
    detail.js                # MOVE from tools/dashboard/static/
    style.css                # MOVE from tools/dashboard/static/
    detail.css               # MOVE from tools/dashboard/static/
  tests/
    api.test.ts              # MOVE from tests/dashboard/
    channel.test.ts          # MOVE from tests/dashboard/
    ctl.test.ts              # MOVE from tests/dashboard/
    discovery.test.ts        # MOVE from tests/dashboard/
    events.test.ts           # MOVE from tests/dashboard/
    frontmatter-io.test.ts   # MOVE from tests/dashboard/
    parsing.test.ts          # MOVE from tests/dashboard/
    server.test.ts           # MOVE from tests/dashboard/
    telemetry.test.ts        # MOVE from tests/dashboard/
  skills/
    dashboard/
      SKILL.md               # MOVE + MODIFY from skills/dashboard/
    build/
      SKILL.md               # MOVE from skills/build/
  ctl.sh                     # MOVE + MODIFY from tools/dashboard/
  package.json               # MOVE from tools/dashboard/
  bun.lock                   # MOVE from tools/dashboard/
  tsconfig.json              # MOVE + MODIFY from tools/dashboard/
  README.md                  # MOVE from tools/dashboard/
  CHANGELOG.md               # MOVE from tools/dashboard/
```

### Files modified in spacedock core (remain in spacedock repo)

```
spacedock/
  references/first-officer-shared-core.md  # MODIFY: portable dashboard lookup
```

### Files removed from spacedock repo after extraction

```
tools/dashboard/             # REMOVE: entire directory (moved to plugin)
tests/dashboard/             # REMOVE: entire directory (moved to plugin)
skills/dashboard/            # REMOVE: entire directory (moved to plugin)
skills/build/                # REMOVE: entire directory (moved to plugin)
```

**Note on build-pipeline workflow:** The `docs/build-pipeline/` directory is NOT moved in this plan. It lives in user projects (or `~/.claude/workflows/`) and is discovered dynamically by the FO via `README.md` frontmatter scanning. The `/build` skill that creates entities for this workflow moves to the dashboard plugin, but the workflow data itself is project-local. This is the correct separation: the skill (tool) lives in the plugin, the workflow data (content) lives in the project.

---

### Task 1: Create plugin scaffolding (plugin.json + .mcp.json)

**Files:**
- Create: `spacedock-dashboard/.claude-plugin/plugin.json`
- Create: `spacedock-dashboard/.mcp.json`

- [ ] **Step 1: Create the plugin root directory structure**

```bash
mkdir -p spacedock-dashboard/.claude-plugin
```

- [ ] **Step 2: Write plugin.json manifest**

```json
{
  "name": "spacedock-dashboard",
  "version": "0.1.0",
  "description": "Spacedock workflow dashboard — web UI, activity feed, and channel plugin for interactive workflow control",
  "author": {
    "name": "CL Kao"
  },
  "repository": "https://github.com/clkao/spacedock-dashboard",
  "license": "Apache-2.0",
  "keywords": [
    "spacedock",
    "dashboard",
    "workflow",
    "visualization",
    "channel"
  ]
}
```

- [ ] **Step 3: Write .mcp.json with channel server registration**

```json
{
  "mcpServers": {
    "spacedock-dashboard": {
      "command": "bun",
      "args": [
        "${CLAUDE_PLUGIN_ROOT}/src/channel.ts"
      ]
    }
  }
}
```

This uses `${CLAUDE_PLUGIN_ROOT}` which is verified to expand correctly in .mcp.json (CLAIM-2 verified: episodic-memory, recce, invest plugins all use this pattern).

- [ ] **Step 4: Commit scaffolding**

```bash
git add spacedock-dashboard/.claude-plugin/plugin.json spacedock-dashboard/.mcp.json
git commit -m "feat(dashboard-plugin): add plugin.json manifest and .mcp.json channel registration"
```

---

### Task 2: Move source files (src/ and static/)

**Files:**
- Create: `spacedock-dashboard/src/` (9 source files + 1 co-located test)
- Create: `spacedock-dashboard/static/` (7 static files)

- [ ] **Step 1: Create directories and copy source files**

```bash
mkdir -p spacedock-dashboard/src spacedock-dashboard/static

# Source files
cp tools/dashboard/src/server.ts spacedock-dashboard/src/
cp tools/dashboard/src/channel.ts spacedock-dashboard/src/
cp tools/dashboard/src/discovery.ts spacedock-dashboard/src/
cp tools/dashboard/src/api.ts spacedock-dashboard/src/
cp tools/dashboard/src/events.ts spacedock-dashboard/src/
cp tools/dashboard/src/frontmatter-io.ts spacedock-dashboard/src/
cp tools/dashboard/src/parsing.ts spacedock-dashboard/src/
cp tools/dashboard/src/telemetry.ts spacedock-dashboard/src/
cp tools/dashboard/src/types.ts spacedock-dashboard/src/
cp tools/dashboard/src/discovery.test.ts spacedock-dashboard/src/

# Static files
cp tools/dashboard/static/index.html spacedock-dashboard/static/
cp tools/dashboard/static/detail.html spacedock-dashboard/static/
cp tools/dashboard/static/app.js spacedock-dashboard/static/
cp tools/dashboard/static/activity.js spacedock-dashboard/static/
cp tools/dashboard/static/detail.js spacedock-dashboard/static/
cp tools/dashboard/static/style.css spacedock-dashboard/static/
cp tools/dashboard/static/detail.css spacedock-dashboard/static/
```

- [ ] **Step 2: Verify source files are self-contained (no spacedock core imports)**

```bash
# Confirm no imports reference paths outside the dashboard
grep -rn "from.*\.\./\.\.\." spacedock-dashboard/src/ || echo "OK: no imports reaching outside dashboard"
```

Expected: no matches (all imports are relative within `src/`).

- [ ] **Step 3: Commit moved source files**

```bash
git add spacedock-dashboard/src/ spacedock-dashboard/static/
git commit -m "feat(dashboard-plugin): move source and static files to plugin root"
```

---

### Task 3: Move package.json, bun.lock, tsconfig.json, docs

**Files:**
- Create: `spacedock-dashboard/package.json` (copy from tools/dashboard/)
- Create: `spacedock-dashboard/bun.lock` (copy from tools/dashboard/)
- Create: `spacedock-dashboard/tsconfig.json` (copy + modify from tools/dashboard/)
- Create: `spacedock-dashboard/README.md` (copy from tools/dashboard/)
- Create: `spacedock-dashboard/CHANGELOG.md` (copy from tools/dashboard/)

- [ ] **Step 1: Copy package.json and bun.lock unchanged**

```bash
cp tools/dashboard/package.json spacedock-dashboard/
cp tools/dashboard/bun.lock spacedock-dashboard/
```

The package.json has no `scripts` field, no `main` field, just dependencies and devDependencies. It works as-is in the new location.

- [ ] **Step 2: Copy and verify tsconfig.json**

```bash
cp tools/dashboard/tsconfig.json spacedock-dashboard/
```

The tsconfig already has `"include": ["src/**/*.ts"]` and `"exclude": ["node_modules"]` -- these paths are relative and work in the new location unchanged.

- [ ] **Step 3: Copy documentation files**

```bash
cp tools/dashboard/README.md spacedock-dashboard/
cp tools/dashboard/CHANGELOG.md spacedock-dashboard/
```

- [ ] **Step 4: Install dependencies in the new plugin location**

```bash
cd spacedock-dashboard && bun install && cd ..
```

- [ ] **Step 5: Run type-check to verify TypeScript config**

```bash
cd spacedock-dashboard && bunx tsc --noEmit && cd ..
```

Expected: 0 errors (all source files are self-contained).

- [ ] **Step 6: Commit**

```bash
git add spacedock-dashboard/package.json spacedock-dashboard/bun.lock spacedock-dashboard/tsconfig.json spacedock-dashboard/README.md spacedock-dashboard/CHANGELOG.md
git commit -m "feat(dashboard-plugin): move package.json, tsconfig, and docs to plugin root"
```

**Note on node_modules:** For local development, `bun install` is run manually. For marketplace distribution, `node_modules/` must be bundled in the published package (marketplace standard per research -- episodic-memory does this). A `.npmignore` or build script for marketplace publishing is out of scope for this plan but should be tracked as a follow-up.

---

### Task 4: Rewrite ctl.sh path resolution (cross-reference breakage point 1)

**Files:**
- Create: `spacedock-dashboard/ctl.sh` (copy + modify from tools/dashboard/)
- Test: `spacedock-dashboard/tests/ctl.test.ts` (moved and updated in Task 6)

This is cross-reference breakage point 1: `ctl.sh` line 6 computes `REPO_ROOT` assuming it lives at `tools/dashboard/ctl.sh` within a larger repo. After extraction, ctl.sh is at the plugin root.

- [ ] **Step 1: Copy ctl.sh to plugin root**

```bash
cp tools/dashboard/ctl.sh spacedock-dashboard/ctl.sh
chmod +x spacedock-dashboard/ctl.sh
```

- [ ] **Step 2: Rewrite REPO_ROOT resolution for dual-mode operation**

Replace line 6 of `spacedock-dashboard/ctl.sh`:

Old:
```bash
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
```

New (dual-mode -- works both as MCP command and skill-invoked):
```bash
# When invoked as an MCP server command, ${CLAUDE_PLUGIN_ROOT} is set.
# When invoked by a skill (Claude runs bash), the skill passes --root or
# we derive from BASH_SOURCE[0] (ctl.sh is at plugin root).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$SCRIPT_DIR}"
```

- [ ] **Step 3: Update entry script paths (lines 156-159)**

Old:
```bash
    local entry_script="tools/dashboard/src/server.ts"
    if [[ "$CHANNEL_MODE" == "true" ]]; then
        entry_script="tools/dashboard/src/channel.ts"
    fi
```

New:
```bash
    local entry_script="${PLUGIN_ROOT}/src/server.ts"
    if [[ "$CHANNEL_MODE" == "true" ]]; then
        entry_script="${PLUGIN_ROOT}/src/channel.ts"
    fi
```

- [ ] **Step 4: Update default ROOT resolution (line 64-65)**

Old:
```bash
if [[ -z "$ROOT" ]]; then
    ROOT="$(git -C "$REPO_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$REPO_ROOT")"
fi
```

New:
```bash
if [[ -z "$ROOT" ]]; then
    ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi
```

When no `--root` is provided, the dashboard discovers the project root from the current working directory (where Claude is running), not from the plugin location. This is the correct behavior: the plugin lives in `~/.claude/plugins/cache/...` but serves the user's project.

- [ ] **Step 5: Verify ctl.sh syntax**

```bash
bash -n spacedock-dashboard/ctl.sh && echo "Syntax OK"
```

Expected: "Syntax OK"

- [ ] **Step 6: Commit**

```bash
git add spacedock-dashboard/ctl.sh
git commit -m "fix(dashboard-plugin): rewrite ctl.sh path resolution for standalone plugin"
```

---

### Task 5: Rewrite skills/dashboard/SKILL.md (cross-reference breakage point 2)

**Files:**
- Create: `spacedock-dashboard/skills/dashboard/SKILL.md` (modified copy)

This is cross-reference breakage point 2: the skill resolves ctl.sh as `{project_root}/tools/dashboard/ctl.sh`. After extraction, it must use `${CLAUDE_SKILL_DIR}/../../ctl.sh` (research correction 1).

- [ ] **Step 1: Create skills directory and copy SKILL.md**

```bash
mkdir -p spacedock-dashboard/skills/dashboard
cp skills/dashboard/SKILL.md spacedock-dashboard/skills/dashboard/SKILL.md
```

- [ ] **Step 2: Rewrite path resolution in SKILL.md**

Replace the Setup section. Old:

```markdown
## Setup

1. Detect project root: `git rev-parse --show-toplevel`
2. Resolve ctl.sh path: `{project_root}/tools/dashboard/ctl.sh`
```

New:

```markdown
## Setup

1. Detect project root: `git rev-parse --show-toplevel`
2. Resolve ctl.sh path: `${CLAUDE_SKILL_DIR}/../../ctl.sh`
```

This uses `${CLAUDE_SKILL_DIR}` which reliably expands in SKILL.md files (research correction 1). Since SKILL.md is at `skills/dashboard/SKILL.md`, `../../` reaches the plugin root where `ctl.sh` lives.

- [ ] **Step 3: Update command templates to use resolved path**

The command templates already use `{ctl}` as a placeholder. The Setup step resolves `{ctl}` -- no further changes needed to the command section. Verify by reading the file:

```bash
grep -n "ctl" spacedock-dashboard/skills/dashboard/SKILL.md
```

Expected: line 2 shows the new resolution, subsequent lines use `{ctl}` placeholder.

- [ ] **Step 4: Commit**

```bash
git add spacedock-dashboard/skills/dashboard/SKILL.md
git commit -m "fix(dashboard-plugin): SKILL.md uses CLAUDE_SKILL_DIR for ctl.sh path resolution"
```

---

### Task 6: Move and update test files (cross-reference breakage point 4)

**Files:**
- Create: `spacedock-dashboard/tests/` (9 test files, modified import paths)

This is cross-reference breakage point 4: test files import from `../../tools/dashboard/src/...`. After extraction, source is at `../src/...` relative to `tests/`.

- [ ] **Step 1: Create tests directory and copy files**

```bash
mkdir -p spacedock-dashboard/tests
cp tests/dashboard/*.test.ts spacedock-dashboard/tests/
```

- [ ] **Step 2: Fix import paths in all test files**

All test files import from `../../tools/dashboard/src/...`. In the new structure, tests are at `tests/` and source is at `src/`, so the relative path is `../src/...`.

```bash
# Fix all import paths in test files
cd spacedock-dashboard
sed -i '' 's|../../tools/dashboard/src/|../src/|g' tests/*.test.ts
cd ..
```

Verify the fix:

```bash
grep -rn "from.*\.\." spacedock-dashboard/tests/ | head -20
```

Expected: all imports show `../src/...` pattern.

- [ ] **Step 3: Fix ctl.test.ts WORKTREE path computation**

The `ctl.test.ts` file (line 6) computes:
```typescript
const WORKTREE = dirname(dirname(import.meta.dir));
```

This assumed the test was at `tests/dashboard/ctl.test.ts` (2 levels up = repo root). In the new structure, the test is at `tests/ctl.test.ts` (1 level up = plugin root). Also, the CTL_PATH (line 7) used `tools/dashboard/ctl.sh` -- must change to just `ctl.sh` at plugin root.

Replace in `spacedock-dashboard/tests/ctl.test.ts`:

Old:
```typescript
const WORKTREE = dirname(dirname(import.meta.dir));
const CTL_PATH = join(WORKTREE, "tools", "dashboard", "ctl.sh");
```

New:
```typescript
const PLUGIN_ROOT = dirname(import.meta.dir);
const CTL_PATH = join(PLUGIN_ROOT, "ctl.sh");
```

And update any references from `WORKTREE` to `PLUGIN_ROOT` throughout the file.

- [ ] **Step 4: Update tsconfig.json to include tests**

Modify `spacedock-dashboard/tsconfig.json` to include tests in type-checking:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd spacedock-dashboard && bun test && cd ..
```

Expected: all 10 test files pass (9 in `tests/` + 1 co-located `src/discovery.test.ts`).

- [ ] **Step 6: Run type-check to verify no type errors**

```bash
cd spacedock-dashboard && bunx tsc --noEmit && cd ..
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add spacedock-dashboard/tests/ spacedock-dashboard/tsconfig.json
git commit -m "fix(dashboard-plugin): move tests with updated import paths"
```

---

### Task 7: Move /build skill to dashboard plugin

**Files:**
- Create: `spacedock-dashboard/skills/build/SKILL.md` (copy unchanged)

The `/build` skill moves to the dashboard plugin per acceptance criteria. It has no reference file dependencies -- it references `spacedock:commission` and `spacedock:first-officer` as user-facing text instructions (which work cross-plugin by namespace) and `superpowers:brainstorming` as a cross-plugin Skill tool call (verified working per CLAIM-5).

- [ ] **Step 1: Copy build skill**

```bash
mkdir -p spacedock-dashboard/skills/build
cp skills/build/SKILL.md spacedock-dashboard/skills/build/SKILL.md
```

- [ ] **Step 2: Verify cross-plugin references are portable**

```bash
grep -n "spacedock:" spacedock-dashboard/skills/build/SKILL.md
grep -n "superpowers:" spacedock-dashboard/skills/build/SKILL.md
```

Expected:
- `spacedock:commission` -- text instruction, user runs as CLI command, works cross-plugin
- `spacedock:first-officer` -- text instruction, user runs as CLI command, works cross-plugin
- `superpowers:brainstorming` -- Skill tool call, verified working cross-plugin

No modifications needed -- all references use fully-qualified `plugin:skill` names.

- [ ] **Step 3: Commit**

```bash
git add spacedock-dashboard/skills/build/SKILL.md
git commit -m "feat(dashboard-plugin): move /build skill to dashboard plugin"
```

---

### Task 8: Update spacedock core — first-officer-shared-core.md (cross-reference breakage point 3)

**Files:**
- Modify: `references/first-officer-shared-core.md` (step 6.5)

This is cross-reference breakage point 3: step 6.5 hardcodes `tools/dashboard/ctl.sh`. After extraction, the FO can no longer assume this path. The dashboard now lives in the plugin cache.

- [ ] **Step 1: Update step 6.5 in first-officer-shared-core.md**

Replace the current step 6.5:

Old:
```
6.5. Check dashboard — run `tools/dashboard/ctl.sh status --root {project_root}`. If not running, prompt captain: "Dashboard is not running. Start it? (http://localhost:8420/)" Wait for captain response. Yes — run `tools/dashboard/ctl.sh start --root {project_root}`. No — skip.
```

New:
```
6.5. Check dashboard — if the `spacedock-dashboard` plugin is installed, invoke `Skill: "spacedock-dashboard:dashboard"` with the argument `status`. If not running, prompt captain: "Dashboard is not running. Start it? (http://localhost:8420/)" Wait for captain response. Yes — invoke `Skill: "spacedock-dashboard:dashboard"` with the argument `start`. No — skip. If the `spacedock-dashboard` plugin is not installed, skip this step silently.
```

This uses cross-plugin skill invocation (`spacedock-dashboard:dashboard`) which is verified to work (CLAIM-5). The FO no longer needs to know where ctl.sh lives -- it delegates to the dashboard plugin's skill, which resolves ctl.sh via `${CLAUDE_SKILL_DIR}`.

- [ ] **Step 2: Verify no other dashboard path references remain**

```bash
grep -n "tools/dashboard" references/first-officer-shared-core.md
```

Expected: 0 matches (step 6.5 was the only reference).

- [ ] **Step 3: Commit**

```bash
git add references/first-officer-shared-core.md
git commit -m "fix(core): FO uses cross-plugin skill for dashboard lookup instead of hardcoded path"
```

---

### Task 9: Handle .mcp.json in spacedock core (cross-reference breakage point 5)

**Files:**
- Modify or remove: `.mcp.json` in spacedock repo root (if it exists and references dashboard)

This is cross-reference breakage point 5: the main project's `.mcp.json` may contain `{"command":"bun","args":["tools/dashboard/src/channel.ts"]}`. After extraction, this is handled by the dashboard plugin's own `.mcp.json`.

- [ ] **Step 1: Check if .mcp.json exists and references dashboard**

```bash
cat .mcp.json 2>/dev/null || echo "No .mcp.json in project root"
```

If it contains a `spacedock-dashboard` entry referencing `tools/dashboard/src/channel.ts`:
- Remove that entry (the dashboard plugin's `.mcp.json` replaces it)
- If this was the only entry, remove the file entirely

If it does not exist or has no dashboard reference: no action needed.

- [ ] **Step 2: Commit if changes were made**

```bash
git add .mcp.json 2>/dev/null
git diff --cached --quiet || git commit -m "fix(core): remove dashboard channel from project .mcp.json (moved to plugin)"
```

---

### Task 10: Remove moved files from spacedock core

**Files:**
- Remove: `tools/dashboard/` (entire directory)
- Remove: `tests/dashboard/` (entire directory)
- Remove: `skills/dashboard/` (directory)
- Remove: `skills/build/` (directory)

This task cleans up the spacedock core repo after all files have been successfully moved and verified in the dashboard plugin.

- [ ] **Step 1: Verify dashboard plugin tests pass before removing originals**

```bash
cd spacedock-dashboard && bun test && cd ..
```

Expected: all tests pass. Do NOT proceed with removal if tests fail.

- [ ] **Step 2: Verify dashboard plugin type-check passes**

```bash
cd spacedock-dashboard && bunx tsc --noEmit && cd ..
```

Expected: 0 errors. Do NOT proceed with removal if type-check fails.

- [ ] **Step 3: Remove moved files from spacedock core**

```bash
git rm -r tools/dashboard/
git rm -r tests/dashboard/
git rm -r skills/dashboard/
git rm -r skills/build/
```

- [ ] **Step 4: Verify spacedock core still functions**

```bash
# Core Python tools should still work
python3 skills/commission/bin/status --help 2>/dev/null && echo "Status tool OK"

# Core skills still present
ls skills/commission/SKILL.md skills/first-officer/SKILL.md skills/ensign/SKILL.md skills/refit/SKILL.md
```

Expected: all 4 core skills present, status tool functional.

- [ ] **Step 5: Commit removal**

```bash
git add -A
git commit -m "refactor(core): remove dashboard files moved to spacedock-dashboard plugin"
```

---

### Task 11: Documentation and post-install instructions

**Files:**
- Modify: `spacedock-dashboard/README.md`

- [ ] **Step 1: Update README.md with installation instructions**

Add an Installation section to the top of `spacedock-dashboard/README.md`:

```markdown
## Installation

### From marketplace (when published)

```
/plugin marketplace add spacedock-dashboard
```

### Local development

```bash
# Clone the plugin
git clone https://github.com/clkao/spacedock-dashboard.git

# Install dependencies (required -- no automatic post-install hook)
cd spacedock-dashboard && bun install

# Add as local plugin
/plugin add local /path/to/spacedock-dashboard
```

### Channel activation

After installation, activate the channel:

```
--channels plugin:spacedock-dashboard
```

During development preview:

```
--dangerously-load-development-channels server:spacedock-dashboard
```

### Prerequisites

- [Bun](https://bun.sh) runtime
- `spacedock` core plugin (for workflow engine: `/spacedock:commission`, `/spacedock:first-officer`)
```

- [ ] **Step 2: Add note about node_modules bundling for marketplace**

Add to README:

```markdown
### Marketplace publishing

When publishing to the marketplace, `node_modules/` must be bundled in the package (Claude Code plugin system has no automatic dependency installation). Run `bun install` before packaging.
```

- [ ] **Step 3: Commit**

```bash
git add spacedock-dashboard/README.md
git commit -m "docs(dashboard-plugin): add installation and usage instructions"
```

---

### Task 12: End-to-end verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite in dashboard plugin**

```bash
cd spacedock-dashboard && bun test && cd ..
```

Expected: all 10 test files pass.

- [ ] **Step 2: Run type-check in dashboard plugin**

```bash
cd spacedock-dashboard && bunx tsc --noEmit && cd ..
```

Expected: 0 errors.

- [ ] **Step 3: Verify ctl.sh syntax**

```bash
bash -n spacedock-dashboard/ctl.sh && echo "Syntax OK"
```

Expected: "Syntax OK"

- [ ] **Step 4: Verify plugin structure is valid**

```bash
# Required: plugin.json with name field
cat spacedock-dashboard/.claude-plugin/plugin.json | grep '"name"'

# Required: .mcp.json with CLAUDE_PLUGIN_ROOT
cat spacedock-dashboard/.mcp.json | grep 'CLAUDE_PLUGIN_ROOT'

# Required: skills present
ls spacedock-dashboard/skills/dashboard/SKILL.md spacedock-dashboard/skills/build/SKILL.md

# Required: ctl.sh uses PLUGIN_ROOT not REPO_ROOT
grep 'PLUGIN_ROOT' spacedock-dashboard/ctl.sh
grep -c 'REPO_ROOT' spacedock-dashboard/ctl.sh  # should be 0
```

Expected: all checks pass.

- [ ] **Step 5: Verify spacedock core is intact**

```bash
# Core plugin.json present
cat .claude-plugin/plugin.json | grep '"name"'

# Core skills present
ls skills/commission/SKILL.md skills/first-officer/SKILL.md skills/ensign/SKILL.md skills/refit/SKILL.md

# FO reference updated
grep -c "tools/dashboard" references/first-officer-shared-core.md  # should be 0
grep "spacedock-dashboard:dashboard" references/first-officer-shared-core.md  # should match
```

Expected: all checks pass.

- [ ] **Step 6: Verify no stale dashboard references remain in core**

```bash
# No remaining references to tools/dashboard in core files
grep -rn "tools/dashboard" skills/ references/ agents/ .claude-plugin/ 2>/dev/null || echo "Clean"

# No remaining references to skills/build in core
grep -rn "skills/build" references/ agents/ 2>/dev/null || echo "Clean"
```

Expected: "Clean" for both.

---

## Quality Gate Summary

| Check | Command | When |
|-------|---------|------|
| TypeScript type-check | `cd spacedock-dashboard && bunx tsc --noEmit` | After Tasks 3, 6, 12 |
| Unit tests | `cd spacedock-dashboard && bun test` | After Tasks 6, 10, 12 |
| Shell syntax | `bash -n spacedock-dashboard/ctl.sh` | After Tasks 4, 12 |
| Plugin structure | Verify plugin.json, .mcp.json, skills/ | After Task 12 |
| Stale reference scan | `grep -rn "tools/dashboard"` in core | After Tasks 10, 12 |
| Core integrity | Verify core skills and status tool | After Task 10 |

## Cross-Reference Breakage Points Addressed

| # | Breakage | Fixed in | How |
|---|----------|----------|-----|
| 1 | ctl.sh REPO_ROOT assumes `tools/dashboard/` location | Task 4 | Dual-mode: `${CLAUDE_PLUGIN_ROOT}` env var with `BASH_SOURCE[0]` fallback |
| 2 | SKILL.md resolves ctl.sh as `{project_root}/tools/dashboard/ctl.sh` | Task 5 | Uses `${CLAUDE_SKILL_DIR}/../../ctl.sh` (research correction 1) |
| 3 | first-officer-shared-core.md step 6.5 hardcodes `tools/dashboard/ctl.sh` | Task 8 | Cross-plugin skill invocation: `spacedock-dashboard:dashboard` |
| 4 | tests/dashboard/ imports from `../../tools/dashboard/src/` | Task 6 | Updated to `../src/` relative path |
| 5 | .mcp.json references `tools/dashboard/src/channel.ts` | Task 9 | Removed from core; dashboard plugin's .mcp.json uses `${CLAUDE_PLUGIN_ROOT}/src/channel.ts` |

## Research Corrections Incorporated

| # | Correction | Applied in |
|---|-----------|------------|
| 1 | SKILL.md must use `${CLAUDE_SKILL_DIR}/../../ctl.sh` not `${CLAUDE_PLUGIN_ROOT}/ctl.sh` | Task 5 |
| 2 | No post-install hook -- bundle node_modules for marketplace, document `bun install` for local | Tasks 3 (note), 11 (docs) |
| 3 | `${CLAUDE_PLUGIN_ROOT}` does not expand in agent markdown files | N/A (no agent files in dashboard plugin need it) |
