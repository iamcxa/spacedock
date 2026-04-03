---
id: 085
title: Agent assembly build step — compile self-contained agent files from references
status: backlog
source: CL — 084 validation findings (haiku path resolution failure)
started:
completed:
verdict:
score: 0.7
worktree:
issue:
pr:
---

# Agent assembly build step

## Problem

Claude Code agent files (`agents/first-officer.md`, `agents/ensign.md`) use a multi-file read chain: thin wrapper → read `references/first-officer-shared-core.md` → read `references/code-project-guardrails.md` → read `references/claude-first-officer-runtime.md`. This fails because:

1. **`${CLAUDE_PLUGIN_ROOT}` doesn't expand in agent markdown files** — known Claude Code issue (#9354)
2. **No env var for plugin directory** — agents have no programmatic way to discover their own plugin path
3. **Haiku guesses wrong paths** — when the agent says "Read `references/...`", haiku searches globally and finds the wrong files (test fixtures, unrelated directories)
4. **Platform best practice is self-contained agents** — plugin-dev agent-development skill says agent body IS the system prompt, max 10K chars, no external reads

Evidence: merge hook E2E test consistently fails with haiku/low because the FO never loads its reference files and skips the entire dispatch/hook protocol.

## Proposed approach

Add a build/assembly step that concatenates reference files into self-contained agent files:

1. `references/` stay as the source of truth (shared with Codex skills)
2. A script assembles `agents/first-officer.md` and `agents/ensign.md` by inlining the relevant reference content
3. The generated files are committed — no runtime file reading needed
4. The release script runs assembly before version bump

This is a compile step: references are source, agent files are build outputs.

## Relationship to 036

Task 036 (commission compile targets) already proposes treating commission as a compiler. This task is narrower — it only compiles the FO and ensign agent files from references, not commission output. Could be folded into 036 or kept separate as a prerequisite.

## Acceptance criteria

1. A script (`scripts/assemble-agents.sh` or similar) generates `agents/first-officer.md` and `agents/ensign.md` from reference files
2. Generated agent files are self-contained — no `Read` instructions pointing to external files
3. Generated agent files are under 10K chars each (per plugin-dev best practice)
4. Haiku/low can follow the assembled agent instructions without path resolution issues
5. Codex skills continue reading from `references/` — no change to Codex path
6. Release script calls assembly before version bump
7. A drift test verifies assembled agents match current references (catches stale builds)
