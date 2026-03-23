---
title: Pre-compiled dist for view scripts
status: backlog
source: refit testflight
started:
completed:
verdict:
score:
worktree:
---

View scripts (like `status`) currently use a two-phase approach: the template contains a self-describing header (goal/instruction/constraints) and a stub body. At commission or refit time, the LLM materializes a working implementation from the description.

This works but means every commission and refit pays the cost of LLM-generating bash, and the output varies between runs. A pre-compiled dist would provide a canonical, tested implementation that can be dropped in directly — skipping materialization when a dist is available.

Considerations:
- Dist implementations need to be portable (bash 3.2+ — macOS default)
- The self-describing header remains the source of truth; dist is just a cached materialization
- Fallback to LLM materialization when no dist matches (e.g., user-customized descriptions)
- Where do dist files live? Alongside templates? Separate `dist/` directory?
- How does version matching work? Dist keyed by template content hash, or by spacedock version?
