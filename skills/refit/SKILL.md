---
name: refit
description: "This skill should be used when the user asks to \"refit a workflow\", \"upgrade a workflow\", \"update workflow scaffolding\", or wants to bring an existing workflow's scaffolding files up to date with the current Spacedock version."
user-invocable: true
---

# Refit a Workflow

You are refitting (upgrading) an existing workflow to match the current Spacedock version. This covers README and any locally pinned agent files, while plugin-shipped runtime assets update automatically. When schema changes require it, you may also migrate entity frontmatter data.

Follow these five phases in order. Do not skip or combine phases.

---

## Phase 1: Discovery

### Step 1 — Identify the workflow

The user must provide a workflow directory path. If they didn't, ask:

> Which workflow directory should I refit?

Store the confirmed path as `{dir}`. Resolve it to an absolute path. Also derive `{project_root}` (git root or cwd) and `{dir_basename}` (last path component).

### Step 2 — Read current scaffolding and extract version stamps

Read each scaffolding file and extract its version stamp:

1. **README** — Read `{dir}/README.md`. Extract version from YAML frontmatter `commissioned-by: spacedock@X.Y.Z`. Store as `{readme_version}`.
2. **Pinned agent files** — Plugin agents are the default runtime. For each agent (`first-officer`, `ensign`, and any agents referenced in README `stages.states`), check whether a local pinned copy exists at `{project_root}/.claude/agents/{agent}.md`. If it exists, compare its content to the canonical plugin agent at `{spacedock_plugin_dir}/agents/{agent}.md`. Store whether each pinned copy matches or differs.
3. **Plugin-shipped runtime assets** — Note that the status viewer and mods are plugin-shipped runtime assets. They are not refit targets and update with the installed Spacedock plugin version.

If a file doesn't exist, note it as missing and skip it.

### Step 3 — Read current Spacedock version

Read `.claude-plugin/plugin.json` from the Spacedock plugin directory (the directory containing the `skills/` folder — resolve from your own plugin context). Extract the `version` field. Store as `{current_version}`.

### Step 4 — Evaluate

- If all version stamps match `{current_version}` and all agent files match their templates: report "Workflow is already up to date." and stop.
- If no stamps were found on any versioned file (README): enter **Degraded Mode** (see below).
- Otherwise: proceed to Phase 2 with the list of outdated files and mismatched agents.

---

## Phase 2: Classify Files by Upgrade Strategy

Each scaffolding file gets a specific upgrade strategy based on how safe it is to auto-replace:

| File | Strategy | Rationale |
|------|----------|-----------|
| `first-officer` pinned agent | **Copy if changed** | Optional local pin of the plugin agent — compare on-disk to the shipped plugin agent, show diff and ask the captain for confirmation before replacing. |
| `README.md` | **Show diff** | Users customize stages, schema fields, quality criteria. Too risky to auto-replace. Show what the current template would produce and let the captain decide. |
| `ensign` pinned agent | **Copy if changed** | Optional local pin of the plugin agent — compare on-disk to the shipped plugin agent, show diff and ask the captain for confirmation before replacing. |
| `{agent}` pinned agent | **Copy if changed** | Optional local pin. Only present for stages that reference a custom agent. Show diff against the shipped plugin agent and ask the captain for confirmation before replacing. |

Present the classification to the captain:

> **Upgrade plan:**
>
> | File | Current State | Strategy |
> |------|--------------|----------|
> | `first-officer` pinned agent | {matches plugin agent / differs / missing} | Copy if changed |
> | `README.md` | {readme_version or "no stamp"} | Show diff (manual review) |
> | `ensign` pinned agent | {matches plugin agent / differs / missing} | Copy if changed |
> | `{agent}` pinned agent (for each) | {matches plugin agent / differs / missing} | Copy if changed |
> | plugin-shipped runtime assets | managed by installed Spacedock version | No action |
>
> Proceed?

Only include agent rows for agents actually referenced in the README `stages.states` entries. Omit agent rows where the on-disk file already matches the template.

Wait for the captain to confirm before proceeding.

---

## Phase 3: Execute Upgrades

### Extract workflow-specific values from README

Before generating any files, read `{dir}/README.md` and extract:

1. **Mission** — from the `# {title}` heading (first H1).
2. **Stages** — from the `## Stages` section. Each `### \`{stage_name}\`` subsection is a stage, in order. For each stage, extract:
   - Stage name
   - Inputs, Outputs, Good, Bad descriptions
   - Whether "Human approval: Yes" appears (indicates an approval gate for the transition INTO this stage)
3. **Schema fields** — from the `## Schema` section's YAML block.
4. **Entity description** — from the first paragraph after the H1.

### 3a. First-Officer Agent (Copy if changed)

1. Compare the local pinned `first-officer` copy at `{project_root}/.claude/agents/{agent}.md` (with `{agent}=first-officer`) to the shipped plugin agent at `{spacedock_plugin_dir}/agents/{agent}.md`.

2. If they match, skip. If they differ, show the captain a diff:

> **First-officer changes:**
> {diff output}
>
> Replace the first-officer agent? (y/n)

3. Wait for the captain's confirmation before replacing.

If the user added custom sections to the first-officer (sections not in the standard template), warn the captain:

> **Warning:** The existing first-officer has custom sections that aren't in the standard template. These will be lost if you replace it:
> {list of custom section headings}

### 3b. README (Show Diff)

1. Generate what the current commission template would produce for this workflow, using the extracted values (mission, stages, schema, etc.).
2. Diff it against the user's current README.
3. Present the diff to the captain, noting which differences are likely template changes vs user customizations:

> **README template diff:**
>
> The following differences exist between your README and what the current template would generate. Differences may be template improvements or your intentional customizations.
>
> {diff output}
>
> I have NOT modified your README. Review the diff and apply any changes you want manually, or tell me which specific changes to make.

Do NOT auto-modify the README. The captain decides what to adopt.

### 3c. Ensign Agent (Copy if changed)

1. Compare the local pinned `ensign` copy at `{project_root}/.claude/agents/{agent}.md` (with `{agent}=ensign`) to the shipped plugin agent at `{spacedock_plugin_dir}/agents/{agent}.md`.

2. If they match, skip. If they differ, show the captain a diff:

> **Ensign agent changes:**
> {diff output}
>
> Replace the ensign agent? (y/n)

3. Wait for the captain's confirmation before replacing the local pinned ensign copy.

### 3d. Stage Agents (Copy if changed)

Scan the README frontmatter `stages.states` for entries with an `agent:` property. For each referenced agent:

1. Check if the shipped plugin agent exists at `{spacedock_plugin_dir}/agents/{agent}.md`. If it does not exist, warn the captain and skip:

> **Warning:** Stage '{stage_name}' references agent '{agent}' but no shipped plugin agent exists at `agents/{agent}.md`. Skipping — any existing local pinned copy will not be updated.

2. If the shipped plugin agent exists, compare `{project_root}/.claude/agents/{agent}.md` to it. If they match, skip. If they differ, show the captain a diff:

> **{agent} agent changes:**
> {diff output}
>
> Replace the {agent} agent? (y/n)

3. Wait for the captain's confirmation before replacing `{project_root}/.claude/agents/{agent}.md`.

If the agent file does not currently exist at `{project_root}/.claude/agents/{agent}.md`, show the full template content and ask:

> **{agent} agent is new** (referenced by stage '{stage_name}' but not yet installed):
> {full content}
>
> Create the {agent} agent? (y/n)

### 3e. Plugin-Shipped Runtime Assets

The status viewer and mods are plugin-shipped runtime assets. They are not copied into workflows during refit. Report this explicitly to the captain:

> Spacedock now uses plugin-shipped runtime assets for workflow status and mods. No workflow-local status script or mod files will be generated or replaced during refit.

---

## Phase 4: Migrate Entity Data

After upgrading scaffolding, check whether schema changes require migrating existing entity data.

### Step 1 — Detect schema changes

Compare the old README's `## Schema` and `### Field Reference` sections against the new version. Look for:

- **Changed field types or ranges** (e.g., score changed from integer/25 to float/0.0–1.0)
- **Renamed fields** (e.g., `priority` → `score`)
- **Removed fields** (fields in entities that are no longer in the schema)
- **New required fields** (fields added to the schema that existing entities lack)

If no schema changes affect entity data, skip to Phase 5.

### Step 2 — Scan entities

For each detected schema change, scan all entity files in `{dir}/*.md` (excluding README.md) and identify which entities have values in the affected fields.

Present findings to the captain:

> **Schema migration needed:**
>
> {description of what changed in the schema}
>
> **Affected entities:**
> {list of entities with current values that need migration}
>
> **Proposed migration:**
> {what the migration would do — e.g., "Convert score from /25 to 0.0–1.0 by dividing by 25"}
>
> Apply this migration? (y/n)

### Step 3 — Execute migration

On the captain's approval, update the affected entity frontmatter fields. Use the Edit tool — never rewrite whole entity files. Only touch the specific fields identified in the migration plan.

Show a summary of what was migrated:

> **Migrated {N} entities:**
> {list of entity: old_value → new_value}

---

## Phase 5: Finalize

1. Update version stamps to `{current_version}` in versioned files that were replaced (README).
2. For the README (if the captain didn't request changes), update only the version stamp in YAML frontmatter: `commissioned-by: spacedock@{current_version}`.
3. Show a summary:

> **Refit complete:**
>
> | File | Action |
> |------|--------|
> | `first-officer.md` | {Replaced / Already current / Skipped} |
> | `ensign.md` | {Replaced / Already current / Skipped} |
> | `{agent}.md` (for each) | {Replaced / Already current / Created / Skipped} |
> | plugin-shipped runtime assets | Managed by installed Spacedock version |
> | `README.md` | {Stamp updated / User-reviewed / No changes} |
>
> Suggest committing:
> ```
> git commit -m "refit: upgrade workflow scaffolding to spacedock@{current_version}"
> ```

---

## Degraded Mode (No Version Stamp)

When no version stamps are found on the README, the original baseline cannot be determined. Inform the captain and offer two options:

> **No version stamps found.** This workflow was commissioned before version stamping was implemented, or the stamps were removed. I can't determine what the original scaffolding looked like.
>
> Two options:
>
> 1. **Stamp only** — Add version stamps to existing files without changing anything else. This establishes a baseline for future refits.
> 2. **Full refit with review** — Generate what the current templates would produce and show a full diff for every scaffolding file. You review and approve each change.
>
> Which option?

### Option 1: Stamp Only

Add version stamps to versioned files without modifying anything else:

- **README.md** — Add YAML frontmatter with `commissioned-by: spacedock@{current_version}` (wrap in `---` delimiters if frontmatter doesn't exist).

Agent files are static templates and do not carry version stamps. They are updated by comparing to the template content.

### Option 2: Full Refit with Review

Execute Phase 3, but show a full diff for every file (including first-officer) and require the captain's explicit approval before replacing each one. Never auto-replace files without a version stamp — the risk of overwriting customizations is too high.

---

## Safety Rules

- **Never modify entity file bodies** — only frontmatter, and only during an approved schema migration.
- **Never auto-replace without a version stamp** — always enter degraded mode.
- **Always show diffs** — even for "replace" strategy files, show the diff before replacing.
- **Git is the safety net** — remind the captain they can `git diff` or `git checkout` to recover.
