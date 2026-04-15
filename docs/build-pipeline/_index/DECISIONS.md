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
