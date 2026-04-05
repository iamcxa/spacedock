---
id: 011
title: Dashboard Collaborative Review — Inline Comments & Suggestions on Entity Files
status: explore
source: channel conversation
started:
completed:
verdict:
score: 0.9
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- Feature 007 completed (channel plugin, bidirectional communication)
- Feature 002 completed (entity detail view with rendered markdown)

## Brainstorming Spec

APPROACH:     Add Google Docs-style inline comments and suggestion mode to the entity detail view. Captain can select text in rendered entity markdown, add comments, or suggest edits. AI receives comments via channel and responds inline. Accepted suggestions write back to the entity file. This transforms the dashboard from a "dashboard + chat" into a "collaborative workspace" where human and AI iterate on entity documents together.
ALTERNATIVE:  Keep all review in terminal chat (rejected: context scattered across conversation, review is whole-file level not paragraph-level, poor DX for iterative refinement)
GUARDRAILS:   Comments must not corrupt entity file format. Suggestion diffs must preserve YAML frontmatter. Concurrent edit protection needed (entity file may be modified by ensign agents while captain is reviewing). Must work with all entity content types (brainstorming specs, stage reports, plans, acceptance criteria).
RATIONALE:    The biggest DX friction in human-AI workflow collaboration is review granularity. Terminal chat forces whole-file-level feedback ("change the third point"). Inline comments let the captain point at exactly what needs changing, and the AI can respond with a precise suggestion rather than rewriting the whole section. This is the natural evolution of the "war room" — from observing and commanding to actively co-authoring.

## Key Design Questions (for brainstorming)

1. Comment model — where are comments stored? Inline in entity file? Separate JSON sidecar? localStorage?
2. Suggestion mode — how to render AI-proposed diffs? Inline strikethrough + green text? Side-by-side?
3. Resolution flow — accept/reject → write back to entity file via existing frontmatter I/O?
4. Channel integration — comments sent as channel messages with section anchors?
5. Concurrent edit protection — what if an ensign modifies the file while captain is commenting?

## Acceptance Criteria

- Captain can select text in entity detail view and add a comment
- Comments appear as annotations alongside the rendered markdown
- AI receives comments via channel with section context (which heading/paragraph)
- AI can respond with inline suggested edits (visible as diff in the UI)
- Captain can accept/reject suggestions — accepted changes write back to entity file
- Comment thread persists until resolved
- Works with all entity body sections (brainstorming spec, stage reports, acceptance criteria)
