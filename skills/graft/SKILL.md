---
name: graft
description: "This skill should be used when the user asks to 'graft a workflow', 'transplant a workflow', 'port a workflow to another repo', 'graft init', 'graft upgrade', 'graft status', 'graft diff', 'graft localize', or wants to install a Spacedock workflow into a target repo with local overrides and version tracking."
argument-hint: "[init <source-path> | localize | upgrade | status | diff]"
user-invocable: true
---

# Graft a Workflow

You are grafting (transplanting) a Spacedock workflow from its source location into a target repository, with local overrides and upstream version tracking. Graft enables a workflow to be reused across projects while preserving the ability to customize project-specific details and merge upstream updates.

This skill is the fourth vertex of the Spacedock workflow-lifecycle quad:

| Skill | Purpose | Precondition |
|-------|---------|--------------|
| `commission` | Greenfield creation | No workflow exists yet |
| `refit` | Version sync | Workflow scaffolding lags Spacedock version |
| `overhaul` | Structural rework | Workflow stage set or body needs redesign |
| `graft` (this) | Cross-repo transplant | Workflow exists in source, target repo wants a tracked copy with local overrides |

Do not use graft for: creating new workflows (use `commission`), upgrading scaffolding in-place (use `refit`), restructuring stages (use `overhaul`), or one-off file copies without version tracking (use `cp` directly).

## Namespace Note

This skill lives at `skills/graft/`; namespace migration to `spacebridge:graft` is Phase F work, same as the other lifecycle skills. The operation surface does not change at migration -- only the dispatch prefix.

## Design Principles

1. **Build-time merge, not runtime merge.** The engine reads a single merged README. Overlays are applied at graft/upgrade time, not at workflow execution time. The engine does not know about graft.

2. **Tier-based skill handling.** Skills are classified into tiers that determine how they are managed:
   - **verbatim** -- no local changes needed. Reference the upstream plugin's skill directly. Zero maintenance on upgrade.
   - **localize** -- project-specific content (CLI commands, paths, infra dependencies). Copied to target repo's `.claude/skills/` with overrides applied. 3-way merge on upgrade.

3. **Overlay format reuses overhaul recipe ops.** LOCAL.yaml operations use the same op language as `overhaul` recipes. One op vocabulary, two triggers (overhaul: one-shot transformation, graft: persistent overlay re-applied on each upgrade).

4. **Prerequisites over assumptions.** Target repo team members must have spacedock + spacebridge plugins installed. Graft generates a prerequisites document on init.

---

## Tools Available

**Can use:**
- `Read` -- read source workflow, skill files, plugin.json, target repo structure
- `Grep` / `Glob` -- scan skill content for portability signals, locate `.claude/skills/`
- `Write` -- write manifest, LOCAL.yaml, merged README, localized skills, prerequisites doc
- `Edit` -- update LOCAL.yaml overrides incrementally
- `Bash` -- `git diff --no-index` for diff preview, `python3` for YAML validation, `git log` for version detection
- `ToolSearch` -- load `AskUserQuestion` for approval gates
- `Agent` -- `Explore` subagent for portability scanning (init only)

---

## Sub-commands

Graft exposes five sub-commands. Parse the user's invocation to determine which to run:

| Invocation | Sub-command | Phase |
|------------|-------------|-------|
| `graft init <source-workflow-path>` | Init | Full pipeline (scan, classify, localize, apply) |
| `graft localize` | Localize | Edit LOCAL.yaml, re-apply overlay |
| `graft upgrade` | Upgrade | Pull new upstream, tier-aware merge, apply |
| `graft status` | Status | Show version, tier distribution, drift, health |
| `graft diff` | Diff | Show local vs origin differences |

If the user says just "graft" with no sub-command:
1. Check if any graft exists at `.spacedock/workflows/` in the current repo
2. If yes: show `graft status` output, then ask what the captain wants to do next
3. If no: ask for a source workflow path to begin `graft init`

---

## File Structure Convention

After `graft init`, the target repo contains:

```
{target-repo}/
├── .spacedock/workflows/{workflow-name}/
│   ├── manifest.yaml                # Source tracking + tier classification + plugin pointer
│   ├── LOCAL.yaml                   # Overlay definition (persistent)
│   ├── _archive/                    # Completed/shipped entities
│   ├── _mods/                       # Project-specific mods
│   ├── _docs/                       # Reference documentation (copied from source)
│   ├── _index/                      # Workflow state
│   │   ├── CONTRACTS.md
│   │   ├── DECISIONS.md
│   │   └── INDEX.md
│   └── *.md                         # Entity files (project work items)
│
│   NOTE: No README.md in the workflow dir. No .origin/ directory.
│         FO reads workflow README from the plugin at startup via manifest.yaml.
│
├── .claude/skills/                  # Target repo's skill directory
│   ├── {existing-skills}/           # Pre-existing project skills
│   ├── build-quality/SKILL.md       # Localized skill copy (graft-managed)
│   ├── build-quality/references/    # Copied reference files
│   └── ...
├── .claude/agents/                  # Target repo's agent directory
│   └── code-explorer.md             # Localized agent copy (graft-managed)
```

---

## Manifest Schema

```yaml
# .spacedock/workflows/{name}/manifest.yaml
source_plugin: spacedock                         # Plugin name; FO resolves plugin_dir from this
workflow_readme_path: docs/build-pipeline/README.md  # Relative path inside plugin to workflow README

source:
  plugin: spacedock                    # Source plugin name (redundant with source_plugin; kept for compatibility)
  workflow_path: docs/build-pipeline   # Relative path within source plugin
  version: "0.9.0"                     # Source plugin version at graft time
  commit_sha: abc1234                  # Source commit (if git repo)
  grafted_at: "2026-04-13"
  grafted_by: kent

skills:
  - name: build-brainstorm
    tier: verbatim
    source_ref: spacedock:build-brainstorm    # Engine resolves via installed plugin
    version: "0.9.0"

  - name: build-quality
    tier: localize
    source_path: skills/build-quality/SKILL.md
    target_path: .claude/skills/build-quality/SKILL.md
    version: "0.9.0"
    source_hash: "e3b0c44298fc1c149afb..."    # SHA256 of plugin SKILL.md bytes at init/upgrade time
    override_count: 4
    portability_signals:                       # Why this was classified as localize
      - "hardcoded CLI: bun test, bun lint, bunx tsc, bun build"

  - name: build-explore
    tier: localize
    source_path: skills/build-explore/SKILL.md
    target_path: .claude/skills/build-explore/SKILL.md
    version: "0.9.0"
    source_hash: "a665a45920422f9d417e..."    # SHA256 of plugin SKILL.md bytes at init/upgrade time
    override_count: 1
    references:                                  # Reference files copied with this skill
      - gray-area-templates.md
      - hybrid-classification-heuristic.md
    agents:                                      # Agents referenced by this skill
      - code-explorer

  - name: build-plan
    tier: localize
    source_path: skills/build-plan/SKILL.md
    target_path: .claude/skills/build-plan/SKILL.md
    version: "0.9.0"
    source_hash: "2c624232cdd221771294..."    # SHA256 of plugin SKILL.md bytes at init/upgrade time
    override_count: 2
    references:
      - plan-checker-prompt.md
    infra:
      - workflow-index
      - CONTRACTS.md

agents:                                          # Agent files managed by graft
  - name: code-explorer
    source_path: agents/code-explorer.md
    target_path: .claude/agents/code-explorer.md
    version: "0.9.0"

local:
  overlay: LOCAL.yaml
  last_applied: "2026-04-13"

infra:
  contracts_md: true
  decisions_md: true
  workflow_index_ported: true

prerequisites:
  required_plugins:
    - spacedock
    - spacebridge
  optional_plugins:
    - pr-review-toolkit
    - e2e-pipeline
```

### source_hash canonicalization

Every `localize`-tier skill entry in manifest.yaml carries a `source_hash` field computed at `graft init` time and updated at `graft upgrade` time. Canonicalization rules:

- **Read as binary bytes**: `open(plugin_skill_path, "rb").read()` — no text decoding.
- **No normalization**: do not strip trailing newlines, swap LF↔CRLF, or apply any transform. Byte-exact match is the simplest correctness rule; any hidden transform is a contract violation waiting to happen.
- **Algorithm**: SHA256 hex digest. Python: `hashlib.sha256(bytes).hexdigest()`.
- **Storage**: store the full 64-character hex string as the `source_hash` string value.
- **Upgrade comparison**: `sha256(current_plugin_bytes) == manifest_source_hash` → Unchanged (no-op). Any difference → Changed (reapply LOCAL.yaml overrides).

---

## LOCAL.yaml Schema

```yaml
# .spacedock/workflows/{name}/LOCAL.yaml
description: "Carlove-specific overrides for build-pipeline workflow"

# Workflow README overrides (overhaul recipe format)
readme_operations:
  # Rewrite skill refs for localized skills
  - type: set-stage-field
    stage: quality
    field: skill
    new_value: build-quality          # .claude/skills/ resolution (no namespace prefix)

  - type: set-stage-field
    stage: plan
    field: skill
    new_value: build-plan

  - type: set-stage-field
    stage: execute
    field: skill
    new_value: build-execute

  - type: set-stage-field
    stage: explore
    field: skill
    new_value: build-explore

# Skill content overrides (per localized skill)
skill_overrides:
  build-quality:
    - anchor: "bun test"
      replace: "pnpm test"
    - anchor: "bun lint"
      replace: "pnpm --filter @app/deno-api check"
    - anchor: "bunx tsc --noEmit"
      replace: "pnpm type-check"
    - anchor: "bun build"
      replace: "pnpm build"

  build-plan:
    - anchor: "spacedock:workflow-index"
      replace: "workflow-index"          # Use local copy in .claude/skills/

  build-execute:
    - anchor: "spacedock:workflow-index"
      replace: "workflow-index"

  build-explore:
    - anchor: "spacedock:code-explorer"
      replace: "code-explorer"           # Must exist in target .claude/agents/ or skills/
```

---

# Sub-command: `graft init`

## Input

Captain provides one argument: the source workflow path (absolute or relative to the source plugin directory).

Example: `graft init ~/Project/spacedock/docs/build-pipeline`

If no argument is provided, ask: "Which workflow should I graft? Provide the path to the source workflow directory."

## Phase 1: Discovery

### Step 1 -- Resolve source

1. Verify source path exists and contains `README.md`
2. Read `README.md`, extract `commissioned-by:` field. If absent, STOP: "Source is not a commissioned workflow."
3. Extract source plugin version from `commissioned-by: spacedock@X.Y.Z`
4. Read source `plugin.json` to get plugin name and version
5. If source is a git repo, capture current commit SHA

### Step 2 -- Resolve target

1. Identify target repo root (current working directory's git root)
2. Verify `.claude/skills/` exists. If not, STOP: "Target repo has no `.claude/skills/` directory. Cannot place localized skills."
3. Check if `.spacedock/workflows/` exists. Create if not.
4. Derive workflow name from source directory basename (e.g., `build-pipeline` -> `build`)
5. Check for existing graft at `.spacedock/workflows/{name}/`. If exists, STOP: "Workflow already grafted. Use `graft upgrade` to update or delete the existing graft first."

### Step 3 -- Inventory skills

1. Parse source README frontmatter to extract all `skill:` references from stage definitions
2. For each referenced skill, locate its SKILL.md in the source plugin's `skills/` directory
3. List any skills that are referenced but not found (warnings, not blockers)

Present discovery summary to captain:

```
## Graft Discovery

Source: {path}
Plugin: {name} @ {version} (commit: {sha})
Workflow: {entity-type} pipeline, {N} stages
Skills referenced: {list}

Target: {repo root}
Target workflow dir: .spacedock/workflows/{name}/
Skill output: .claude/skills/

Proceeding to Phase 2: Portability Scan.
```

## Phase 2: Portability Scan + Tier Classification

### Step 4 -- Scan each skill

For each skill referenced in the workflow, read its SKILL.md and scan for portability signals:

**Localize signals** (any match -> tier: localize):
- Hardcoded CLI commands: `bun `, `npm `, `pnpm `, `yarn `, `cargo `, `make `, `go `, `pip `, `poetry `
- Hardcoded paths: `src/`, `apps/`, `domains/`, `packages/`, or any absolute paths
- Infrastructure references: `CONTRACTS.md`, `DECISIONS.md`, `workflow-index`, `_index/`
- Agent references to non-engine agents (agents not shipped with spacedock)
- Framework-specific patterns: `drizzle`, `prisma`, `django`, `rails`, etc.

**Verbatim signals** (none of the above found):
- Pure generic logic (question/answer flows, research methodology, classification heuristics)
- Optional external dependencies with graceful fallback
- No hardcoded commands, paths, or framework references

### Step 5 -- Present classification for captain review

Load `AskUserQuestion` via `ToolSearch("select:AskUserQuestion")`.

Present tier classification:

```
## Portability Scan Results

Verbatim (reference upstream, zero maintenance):
  - build-brainstorm: pure generic spec distiller
  - build-clarify: interactive Q&A, no repo assumptions
  - build-review: bare-mode fallback available
  - build-uat: graceful degradation without e2e-pipeline
  - build-research: generic 5-domain methodology
  - build-distill: meta-analytical, no repo assumptions

Localize (copy + override):
  - build-quality: hardcoded CLI (bun test, bun lint, bunx tsc, bun build)
  - build-explore: references code-explorer agent
  - build-plan: references CONTRACTS.md + workflow-index
  - build-execute: references CONTRACTS.md + workflow-index

Confirm this classification? (y / or specify overrides, e.g. "move build-review to localize")
```

Wait for captain confirmation. Apply any tier overrides the captain specifies.

## Phase 3: Interactive Localization

For each **localize** tier skill, interactively determine overrides:

### Step 6 -- Per-skill override collection

For each localize skill, present the detected signals and ask for replacement values:

```
## build-quality: CLI Command Overrides

Detected hardcoded commands:
  1. `bun test` -> what is your project's test command?
  2. `bun lint` -> what is your project's lint command?
  3. `bunx tsc --noEmit` -> what is your project's type-check command?
  4. `bun build` -> what is your project's build command?
```

For infrastructure-dependent skills (build-plan, build-execute):

```
## build-plan: Infrastructure Dependencies

This skill calls `spacedock:workflow-index` for cross-entity tracking.
You chose full port (Q5=A). I will:
  1. Copy workflow-index skill to .claude/skills/workflow-index/
  2. Create _index/CONTRACTS.md and _index/DECISIONS.md
  3. Rewrite skill refs from spacedock:workflow-index -> workflow-index

Confirm? (y/n)
```

### Step 7 -- Auto-detect from target repo

Before asking the captain, attempt to auto-detect project conventions:

```bash
# Detect package manager
test -f package.json && cat package.json | python3 -c "import sys,json; pm=json.load(sys.stdin).get('packageManager',''); print(pm)" 2>/dev/null
test -f bun.lockb && echo "bun detected"
test -f pnpm-lock.yaml && echo "pnpm detected"
test -f yarn.lock && echo "yarn detected"
test -f package-lock.json && echo "npm detected"
test -f Cargo.toml && echo "cargo detected"

# Detect test/build commands from package.json scripts
cat package.json | python3 -c "import sys,json; s=json.load(sys.stdin).get('scripts',{}); [print(f'{k}: {v}') for k,v in s.items() if k in ('test','lint','build','type-check','check')]" 2>/dev/null
```

Present detected values as defaults, captain confirms or overrides.

## Phase 4: Apply

### Step 8 -- Create directory structure

```bash
mkdir -p .spacedock/workflows/{name}/.origin/skills
mkdir -p .spacedock/workflows/{name}/_index
```

### Step 9 -- Write files (in order)

1. **Copy upstream originals to `.origin/`:**
   - Copy source README.md -> `.origin/README.md`
   - For each localize tier skill:
     - Copy source SKILL.md -> `.origin/skills/{name}/SKILL.md`
     - If the skill's SKILL.md contains `Read →` or `Read ->` references to `references/*.md` files, also copy those reference files -> `.origin/skills/{name}/references/`
   - For each localize tier skill that references agents (e.g., `spacedock:code-explorer`):
     - Check if the agent definition exists in source plugin's `agents/` directory
     - Copy agent .md file -> `.origin/agents/{agent-name}.md`

2. **Write manifest.yaml** to `.origin/manifest.yaml`

3. **Write LOCAL.yaml** with collected overrides

4. **Apply localized skills:**
   For each localize tier skill:
   - Start from `.origin/skills/{name}/SKILL.md`
   - Apply `skill_overrides[{name}]` from LOCAL.yaml (anchor-based find-replace)
   - Write result to `.claude/skills/{name}/SKILL.md`
   - If `.origin/skills/{name}/references/` exists, copy reference files to `.claude/skills/{name}/references/`

5. **Apply localized agents** (if any were copied in step 1):
   For each agent in `.origin/agents/`:
   - Apply namespace overrides (e.g., `spacedock:` -> local refs)
   - Write result to `.claude/agents/{agent-name}.md`

6. **Apply README overlay:**
   - Start from `.origin/README.md`
   - Apply `readme_operations` from LOCAL.yaml (same logic as overhaul Step 4)
   - Write merged result to `README.md`

7. **Port infrastructure** (if Tier 3 skills present):
   - Copy workflow-index SKILL.md to `.claude/skills/workflow-index/SKILL.md`
   - Apply namespace overrides (spacedock:workflow-index -> workflow-index)
   - Create empty `_index/CONTRACTS.md` and `_index/DECISIONS.md` with header template
   - Copy workflow-index reference files to `.claude/skills/workflow-index/references/`

8. **Write prerequisites doc** to `.spacedock/workflows/{name}/PREREQUISITES.md`

### Step 10 -- Post-apply validation

1. YAML parse check on merged README
2. Stage-body correspondence (each stage has a body subsection)
3. Skill ref resolution:
   - Verbatim refs (`spacedock:build-*`) -- verify spacedock plugin is installed
   - Localize refs (`build-*`) -- verify `.claude/skills/{name}/SKILL.md` exists
4. Reference file resolution: for each localize skill with `references` in manifest, verify files exist at `.claude/skills/{name}/references/`
5. Agent resolution: for each agent in manifest `agents` list, verify `.claude/agents/{name}.md` exists
6. Infrastructure files exist (if Tier 3)

### Step 11 -- Report

```
## Graft Complete

Source: {plugin}@{version} ({workflow_path})
Target: .spacedock/workflows/{name}/

Skills:
  Verbatim (referencing upstream): {N} ({list})
  Localized (copied to .claude/skills/): {M} ({list})
  Reference files copied: {K} across {J} skills
  Agents ported: {A} ({list or "none"})
  Infrastructure ported: {list or "none"}

Files created:
  .spacedock/workflows/{name}/README.md          (merged)
  .spacedock/workflows/{name}/.origin/manifest.yaml
  .spacedock/workflows/{name}/.origin/README.md
  .spacedock/workflows/{name}/LOCAL.yaml
  .claude/skills/{localized skill list}
  .claude/agents/{agent list if any}
  {infra files if any}

Prerequisites: see PREREQUISITES.md
Next: run the workflow with `claude --agent spacedock:first-officer`
```

---

# Sub-command: `graft upgrade`

## Input

Captain invokes `graft upgrade` from the target repo. Optionally specifies workflow name (defaults to the only grafted workflow, or asks if multiple).

## Phase 1: Discovery

### Step 1 -- Load current graft state

1. Read `.spacedock/workflows/{name}/.origin/manifest.yaml`
2. Extract current source version, commit SHA, tier classifications
3. Read current LOCAL.yaml

### Step 2 -- Locate upstream source

1. Resolve source plugin path from manifest `source.plugin`
2. Read upstream README.md and plugin.json for current version
3. If upstream version == manifest version, report "Already up to date." and stop
4. Read upstream skill files for all localize tier skills

### Step 3 -- Compute upstream diff

For the README and each localize tier skill:
```bash
git diff --no-index .origin/README.md {upstream_readme} || true
git diff --no-index .origin/skills/{name}/SKILL.md {upstream_skill} || true
```

Categorize changes per file:
- **Unchanged** -- no diff
- **Changed** -- upstream has modifications

## Phase 2: Tier-Aware Merge

### Step 4 -- Process each component

**Verbatim skills:** No action needed. They reference the upstream plugin, which the captain updates independently (plugin update = skill update).

**Localize skills with upstream changes:**

For each changed localize skill:
1. Load three versions:
   - `old_origin`: `.origin/skills/{name}/SKILL.md` (upstream at graft/last-upgrade time)
   - `new_origin`: current upstream `skills/{name}/SKILL.md`
   - `local_overrides`: `LOCAL.yaml` `skill_overrides[{name}]`
2. Compute upstream delta: diff `old_origin` vs `new_origin`
3. Check for conflicts:
   - For each override anchor in `local_overrides`:
     - Does the upstream delta touch the same region?
     - YES -> CONFLICT (captain must decide)
     - NO -> auto-merge (apply upstream delta, then re-apply override)
4. Also check: do all override anchors still exist in `new_origin`?
   - Missing anchor -> STALE OVERRIDE (captain must update LOCAL.yaml)

**Localize skills without upstream changes:**
- Re-apply overrides (idempotent). No merge needed.

**Workflow README with upstream changes:**
- Same 3-way logic as skills, using `readme_operations` from LOCAL.yaml.

**Infrastructure changes:**
- Check if upstream workflow-index skill changed
- If changed: present diff, ask captain whether to update local copy
- Check if upstream added new infra dependencies not present in manifest

### Step 5 -- Present upgrade report

Load `AskUserQuestion` via ToolSearch.

```
## Upgrade Report: {old_version} -> {new_version}

Verbatim skills: {N} (auto-follow upstream, no action needed)

Localize skills:
  Auto-merged: {list} (upstream changes + local overrides, no conflicts)
  Unchanged: {list}
  CONFLICT: {list with details}
    - build-quality: upstream changed "bun test" region
      but LOCAL overrides "bun test" -> "pnpm test"
      -> Keep local override? Or adopt upstream change + re-localize?
  STALE OVERRIDE: {list}
    - {skill}: anchor "{anchor}" no longer exists in upstream
      -> Remove override? Or update anchor?

Infrastructure:
  workflow-index: {changed|unchanged}
  New dependencies: {list or "none"}

README:
  {auto-merged | conflict details}

Apply this upgrade? [y / n / review-conflicts]
```

### Step 6 -- Apply

On captain approval:

1. Update `.origin/README.md` with new upstream version
2. Update `.origin/skills/` with new upstream skill versions
3. Update `manifest.yaml`: version, commit_sha, grafted_at
4. Re-apply LOCAL.yaml to produce merged README and localized skills
5. Write all merged outputs
6. Run post-apply validation (same as init Step 10)

---

# Sub-command: `graft localize`

Modify LOCAL.yaml overrides and re-apply.

1. Read current LOCAL.yaml
2. Present current overrides to captain
3. Captain specifies changes (add/remove/modify overrides)
4. Update LOCAL.yaml
5. Re-apply: regenerate merged README and localized skills from `.origin/` + updated LOCAL.yaml
6. Show diff of what changed
7. Run post-apply validation

---

# Sub-command: `graft status`

Read-only status report.

1. Read manifest.yaml
2. Check if upstream plugin version has changed (compare manifest version vs installed plugin version)
3. For each localize tier skill:
   - Compare `.claude/skills/{name}/SKILL.md` against what LOCAL.yaml + `.origin/` would produce
   - If different: DRIFT detected (someone edited the localized skill directly)
4. Report:

```
## Graft Status: {workflow-name}

Source: {plugin}@{manifest_version} (installed: {current_plugin_version})
Grafted: {date} by {user}
Last upgrade: {date or "never"}

Update available: {yes (X.Y.Z -> A.B.C) | no}

Skills by tier:
  Verbatim ({N}): {list}
  Localized ({M}): {list}

Override health:
  Healthy: {N} overrides across {M} skills
  Stale: {list of overrides whose anchors may have drifted}

Drift detection:
  Clean: {list}
  DRIFTED: {list} (localized skill was edited directly, not via LOCAL.yaml)

Infrastructure:
  CONTRACTS.md: {N} entries
  DECISIONS.md: {N} entries
```

---

# Sub-command: `graft diff`

Show differences between local and origin for localize tier only.

1. For each localize tier skill:
   ```bash
   git diff --no-index .origin/skills/{name}/SKILL.md .claude/skills/{name}/SKILL.md || true
   ```
2. For README:
   ```bash
   git diff --no-index .origin/README.md .spacedock/workflows/{name}/README.md || true
   ```
3. Present diffs grouped by file. Verbatim tier skills are excluded (they reference upstream directly, no local copy to diff).

---

## No Exceptions (Load-Bearing)

- **NEVER** graft a source that lacks `commissioned-by:` frontmatter. Check at Phase 1 Step 1 and stop if absent.
- **NEVER** modify `.origin/` files after initial copy (init) or upgrade. These are read-only reference copies.
- **NEVER** skip the tier classification captain review at Phase 2 Step 5 of init. Even if heuristic is confident, captain confirms.
- **NEVER** auto-resolve conflicts during upgrade. Conflicts require captain decision.
- **NEVER** edit localized skills in `.claude/skills/` directly during graft operations. Always generate from `.origin/` + LOCAL.yaml. Direct edits cause drift (detected by `graft status`).
- **NEVER** copy verbatim tier skills. They reference the upstream plugin. Copying them defeats the purpose of zero-maintenance upstream tracking.
- **NEVER** run graft init on a workflow that is already grafted. Check at Phase 1 Step 2 and stop. Captain must delete existing graft first, or use `graft upgrade`.
- **NEVER** assume the target repo has any specific project structure beyond `.claude/skills/`. Graft works with any repo that has a `.claude/` directory.

---

## Rules

1. **Phases are strictly ordered** within each sub-command. Never skip, reorder, or combine phases.
2. **LOCAL.yaml is the single source of truth** for all local customizations. Direct edits to localized skills are drift, not authoritative changes.
3. **`.origin/` is immutable between graft operations.** Only `graft init` and `graft upgrade` write to `.origin/`. All other operations read from it.
4. **Tier classification is per-skill, per-graft.** The same skill might be verbatim in one target repo and localize in another. The classification is stored in the manifest, not in the source.
5. **Approval gates are absolute.** Tier classification (init) and upgrade conflicts require captain confirmation. No auto-approve.
6. **Override anchors are fragile.** They depend on specific text existing in the upstream skill. `graft status` and `graft upgrade` detect stale anchors proactively.
7. **Infrastructure is opt-in but all-or-nothing per skill.** If a skill needs workflow-index, the entire workflow-index skill + CONTRACTS.md + DECISIONS.md must be ported. No partial infra.

---

## Red Flags -- STOP and Escalate

- **Source has no `commissioned-by:` frontmatter** -> Stop with refusal
- **Target has no `.claude/skills/` directory** -> Stop, explain requirement
- **Existing graft detected at target path** -> Stop, suggest `graft upgrade` or manual deletion
- **Skill ref in source points to non-existent skill file** -> Warn (not block), note in manifest
- **Captain overrides a verbatim classification to localize but provides no overrides** -> Warn: "This skill will be copied with no changes. Consider keeping it as verbatim for zero-maintenance upstream tracking."
- **Upgrade detects upstream removed a stage entirely** -> BREAKING change, must escalate to captain with full context
- **Override anchor not found in upstream during upgrade** -> STALE override, escalate to captain

---

## Related Skills

- `commission` (greenfield sibling) -- `skills/commission/SKILL.md`
- `refit` (version-sync sibling) -- `skills/refit/SKILL.md`
- `overhaul` (structural rework sibling) -- `skills/overhaul/SKILL.md`
- `workflow-index` (infrastructure dependency for Tier 3 skills) -- `skills/workflow-index/SKILL.md`
