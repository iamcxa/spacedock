---
title: Make pipeline entities more organizable
status: ideation
source: CL
started: 2026-03-25T05:00:00Z
completed:
verdict:
score: 0.60
worktree:
---

As pipelines grow (this one has 30+ entities), the flat directory of markdown files gets messy. Need a way to keep entities organized and navigable.

Directions to consider:

1. **Archive directory** — move completed/done entities into a subdirectory (e.g., `docs/plans/archive/`) to keep the active working set small. Status script and views would need to scan both locations.

2. **Date prefix in filename** — e.g., `2026-03-24-codex-compatibility.md` so files sort chronologically. Gives natural ordering. Trade-off: longer filenames, slug references change.

3. **Short identifier** — like what beads does, with a variable-length truncated UUID that grows as the entity count increases. Gives stable, compact identifiers for cross-referencing. E.g., `a3f-codex-compatibility.md` or just `a3f.md` with the title in frontmatter.

These aren't mutually exclusive. The solution should keep PTP's plain-text simplicity while scaling to dozens or hundreds of entities.
