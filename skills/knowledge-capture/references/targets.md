# D2 Target Selection

Once a finding has passed both gates (see `gates.md`), the next step is choosing WHERE to write the rule. Different findings belong at different levels of the CLAUDE.md hierarchy.

## Level Hierarchy

| Level | Target File | When to Use |
|-------|-------------|-------------|
| **plugin** | `{plugin}/reference/learned-patterns.md` | D1 default — skill-level reusable patterns (not D2, always D1) |
| **user-global** | `~/.claude/CLAUDE.md` | Rules that apply to ALL of the user's projects. Rare. Requires explicit captain consent. |
| **project** | `{repo}/CLAUDE.md` | Rules that apply to the whole repo. Most common D2 target. |
| **module** | `{repo}/{subdir}/CLAUDE.md` | Rules that apply only to a specific module/directory. Use when scope is clearly narrower than project-wide. |
| **lessons** | `{repo}/.claude/review-lessons.md` | Contextual gotchas that aren't enforceable rules. Use when you can't phrase it as "do X / never Y". |
| **decisions** | `docs/build-pipeline/_index/DECISIONS.md` | Spacebridge-internal workflow decisions that affect future entities. Used by clarify stage and knowledge-capture when finding involves a workflow-level choice. |

## Target Selection Logic

```
For each D2 candidate:

1. Is this a spacebridge workflow decision (affects how future entities are planned)?
   → target: decisions

2. Is the finding expressible as a concrete rule (do X / never Y)?
   YES:
     a. Does the rule apply to all of the user's projects (not just this repo)?
        YES → target: user-global (rare)
     b. Does the rule apply to a specific subdirectory only?
        YES → target: module ({repo}/{subdir}/CLAUDE.md)
     c. Otherwise:
        → target: project ({repo}/CLAUDE.md)
   NO:
     → target: lessons ({repo}/.claude/review-lessons.md)
```

## User-Global Restriction

Writes to `~/.claude/CLAUDE.md` require **explicit captain confirmation with a secondary question**. Apply mode must ask: "This rule would apply to ALL your projects. Confirm?" before writing. Decline → fall back to project level.

## Module Detection

When the finding's source_file is in a subdirectory with its own CLAUDE.md, prefer module level over project level. Walk up the directory tree from source_file; the first CLAUDE.md encountered is the target (before reaching repo root).

Example: finding in `tools/dashboard/static/app.js` → check `tools/dashboard/static/CLAUDE.md`, then `tools/dashboard/CLAUDE.md`, then `{repo}/CLAUDE.md`. Use whichever exists (closest wins).

## Output Schema

```yaml
target:
  level: project
  file: /Users/kent/Project/spacedock/CLAUDE.md
  proposed_edit: |
    Append to § Frontend Patterns:
    "Never mutate React state directly. Use setX(prev => ...) or immutable helpers.
     Rationale: concurrent updates drop direct mutations."
  requires_secondary_confirmation: false
```

The `proposed_edit` field is a human-readable description of what will be written. Apply mode shows this to captain before editing.

## Integration

- Capture mode uses this to stage D2 candidates with their proposed target in the entity body's `## Pending Knowledge Captures` section.
- Apply mode reads the staged target, presents to captain for confirmation, and performs the Edit on approval.
