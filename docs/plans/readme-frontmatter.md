---
title: Use YAML frontmatter in generated README instead of HTML comments
status: implementation
source: CL feedback
started: 2026-03-24T19:25:00Z
completed:
verdict:
score: 0.70
worktree: .worktrees/ensign-ux-fixes
---

The generated pipeline README stores metadata as HTML comments:

```html
<!-- commissioned-by: spacedock@0.2.0 -->
<!-- entity-type: product_idea -->
<!-- entity-label: idea -->
<!-- entity-label-plural: ideas -->
```

These should be YAML frontmatter instead:

```yaml
---
commissioned-by: spacedock@0.2.0
entity-type: product_idea
entity-label: idea
entity-label-plural: ideas
---
```

Reasons:
- Consistent with entity file pattern (everything uses YAML frontmatter)
- Standard YAML parsing instead of regex on HTML comments
- The first-officer already knows how to read frontmatter
- Pipeline discovery (future multi-pipeline first-officer) can use the same extraction logic for both README metadata and entity fields

## Design

### 1. README template (SKILL.md section 2a)

Replace the four HTML comments at the top of the template with YAML frontmatter:

Before:
```markdown
<!-- commissioned-by: spacedock@{spacedock_version} -->
<!-- entity-type: {entity_type} -->
<!-- entity-label: {entity_label} -->
<!-- entity-label-plural: {entity_label_plural} -->

# {mission}
```

After:
```markdown
---
commissioned-by: spacedock@{spacedock_version}
entity-type: {entity_type}
entity-label: {entity_label}
entity-label-plural: {entity_label_plural}
---

# {mission}
```

The ABOUTME comments at the top of SKILL.md itself are unaffected.

### 2. First-officer template (SKILL.md section 2d)

No change needed. The first-officer startup step 2 says "Read the README" — it reads the full file, including frontmatter. The agent already knows how to interpret YAML frontmatter from entity files. The `commissioned-by` field in the first-officer's own frontmatter is already YAML and stays as-is.

### 3. Refit skill (skills/refit/SKILL.md)

The refit skill references the HTML comment format in three places:

**Phase 1 Step 2 (line 31):** Change README version extraction from:
> Extract version from `<!-- commissioned-by: spacedock@X.Y.Z -->`

to:
> Extract version from YAML frontmatter `commissioned-by: spacedock@X.Y.Z`

**Phase 5 Step 2 (line 197):** Change version stamp update from:
> update only the version stamp comment: `<!-- commissioned-by: spacedock@{current_version} -->`

to:
> update only the version stamp in YAML frontmatter: `commissioned-by: spacedock@{current_version}`

**Degraded Mode stamp-only (line 232):** Change from:
> Insert `<!-- commissioned-by: spacedock@{current_version} -->` as the first line.

to:
> Add YAML frontmatter with `commissioned-by: spacedock@{current_version}` (wrap in `---` delimiters if frontmatter doesn't exist).

### 4. Test harness (v0/test-commission.sh)

No change needed. The test harness does not check for the HTML comments or YAML frontmatter metadata in the README. It checks for section headings (File Naming, Schema, Stages, etc.) and stage names.

### 5. Existing pipeline READMEs

Existing READMEs (e.g., `docs/plans/README.md`) still have HTML comments. The refit skill handles migration — when it next runs on these pipelines, it will encounter the old format in Degraded Mode or Phase 5 and update to frontmatter.

No manual migration of existing READMEs in this change.

## Acceptance Criteria

- AC1: The README template in SKILL.md section 2a uses YAML frontmatter (`---` delimiters) instead of HTML comments for `commissioned-by`, `entity-type`, `entity-label`, `entity-label-plural`.
- AC2: The refit skill (skills/refit/SKILL.md) references YAML frontmatter instead of HTML comments for README version extraction in all three locations (Phase 1 Step 2, Phase 5 Step 2, Degraded Mode).
- AC3: The first-officer template in SKILL.md section 2d is unchanged (no references to these HTML comments exist there).
- AC4: The test harness (v0/test-commission.sh) passes without modification.
- AC5: A newly commissioned pipeline README starts with YAML frontmatter containing the four metadata fields.
