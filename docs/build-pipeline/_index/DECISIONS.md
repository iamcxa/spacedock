# Decisions Log

Auto-maintained by workflow skills. Append-only. Superseded decisions marked, never deleted.

Each decision is a `## D-{entity-slug}-{sequence}` block with Source, Scope, Rationale, Related entities, Status, and optional Supersedes reference.

---

## D-plan-defect-autopilot-1: Benign-Drift Classifier location

- **Entity**: 106 (plan-defect-autopilot)
- **Date**: 2026-04-15
- **Source**: O-1 captain decision during clarify (interactive AskUserQuestion)
- **Scope**: `skills/build-execute/SKILL.md`
- **Decision**: The benign-drift classifier inserts into `skills/build-execute/SKILL.md` immediately before `## BLOCKED Escalation Ladder`, NOT into `references/claude-first-officer-runtime.md`.
- **Rationale**: Co-location with the haiku→sonnet→opus escalation ladder (build-execute/SKILL.md:216-224). The FO runtime file has no BLOCKED content — inserting a classifier there would require inventing a new section and would violate co-location. APPROACH Part C's original target-file wording was incorrect; O-1 corrected it.
- **Related entities**: 104 (brainstorm-nuwa-distillation — stale-anchor + circular-AC evidence), 105 (explore-nuwa-subagent-first — file-rename evidence)
- **Status**: active

---

## D-101-runtime-overlay (2026-04-15)

- **Entity**: 101 (graft-runtime-overlay-redesign)
- **Date**: 2026-04-15
- **Source**: Captain directive after carlove graft session postmortem (pressure tests #14-22)
- **Scope**: `skills/graft/SKILL.md`, `references/first-officer-shared-core.md`
- **Context**: Build-time merge in graft produced O(N) bugs in carlove session (pressure tests #14-22). Architecture was systemically wrong — copying files creates an entire maintenance surface that generates new bugs with every file added.
- **Decision**: Adopt runtime overlay: FO reads workflow README from plugin at startup, applies LOCAL.yaml `readme_operations` in-memory. Graft stores manifest.yaml with `source_plugin` + `workflow_readme_path` + per-skill `source_hash`. Eliminate `.origin/` directory and merged `README.md` in workflow dir. Hash-based reapply replaces 3-way merge for localized skill upgrades.
- **Consequences**: Upgrade path is hash-compare + reapply (no 3-way merge). Localized-skill regeneration on every upgrade/localize invocation. plugin.json schema unchanged (custom fields would fail `claude plugin validate`). Bug #20/#21/#22 structurally mooted. Backward compat for existing carlove graft deferred to entity 112.
- **Related entities**: entity 112 (graft-backward-compat-and-localization-hardening — child); entity 090 (shipped-stage-mod-and-graft-migration — Part 2 absorbed here)
- **Status**: active
