---
id: 045
title: Add --next option to status script for dispatchable entity detection
status: backlog
source: adoption feedback
started:
completed:
verdict:
score: 0.85
worktree:
---

The first officer currently scans entity frontmatter manually to determine what's dispatchable. This is mechanical work (check stage ordering, concurrency limits, worktree status) that an LLM does unreliably — it's branching logic over structured data.

Add a `--next` option to the status script that outputs which entities are ready for their next stage. The status script already parses frontmatter; this extends it with stage ordering and concurrency awareness.

Motivated by adoption feedback: "Move the mechanical parts into code. The status script already exists — extend that pattern."
