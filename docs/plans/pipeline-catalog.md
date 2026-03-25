---
id: 031
title: Pipeline template packaging and ship catalog
status: backlog
source: CL
started:
completed:
verdict:
score:
worktree:
---

Users who commission a pipeline (like email-triage) end up with a working, tuned pipeline. They should be able to package it as a reusable template and publish it for others.

Two parts:

1. **Export/packaging** — `spacedock export` strips entity instances from a commissioned pipeline, keeping the skeleton: README (schema + stages), status script, stage definitions, first-officer template. Produces a template others can commission from. Needs a manifest with metadata (name, description, required tools/integrations).

2. **Ship catalog hub** — A registry where users publish and browse pipeline templates. "Email triage pipeline", "code review pipeline", "content pipeline", etc. Users commission from a template instead of from scratch: `spacedock commission --from catalog/email-triage`.

Inspired by the email-triage testflight — a real pipeline that works and could be reusable.
