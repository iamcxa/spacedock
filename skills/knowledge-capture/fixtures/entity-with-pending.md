---
id: fixture-entity-1
title: Fixture entity with pending captures
status: review
---

# Fixture Entity 1

Used by knowledge-capture apply-mode tests.

## Pending Knowledge Captures

<capture id="kc-1" severity="HIGH" root="NEW" target="/fake/repo/tools/dashboard/CLAUDE.md">
  <finding>
  Direct React state mutation detected. Violates concurrent update semantics.
  </finding>
  <proposed_edit>
  Append to tools/dashboard/CLAUDE.md § Frontend:
  "Never mutate React state directly; use setX(prev => ...) pattern."
  </proposed_edit>
  <source_stage>review</source_stage>
  <source_entity>fixture-entity-1</source_entity>
  <source_file>tools/dashboard/static/app.js</source_file>
  <source_line>244</source_line>
  <detected_by>pr-review-toolkit:code-reviewer</detected_by>
</capture>

<capture id="kc-2" severity="MEDIUM" root="CODE" target="/fake/repo/CLAUDE.md">
  <finding>
  Missing null check in auth middleware.
  </finding>
  <proposed_edit>
  Append: "Always null-check user object in auth middleware."
  </proposed_edit>
  <source_stage>review</source_stage>
  <source_entity>fixture-entity-1</source_entity>
  <source_file>src/auth/middleware.ts</source_file>
  <source_line>42</source_line>
  <detected_by>pr-review-toolkit:silent-failure-hunter</detected_by>
</capture>

<capture id="kc-3" severity="HIGH" root="NEW" target="/fake/repo/CLAUDE.md">
  <finding>
  WebSocket reconnection catch block swallows errors.
  </finding>
  <proposed_edit>
  Append: "Never swallow exceptions in async reconnect logic; log and re-throw or retry with backoff."
  </proposed_edit>
  <source_stage>review</source_stage>
  <source_entity>fixture-entity-1</source_entity>
  <source_file>tools/dashboard/static/ws-client.js</source_file>
  <source_line>102</source_line>
  <detected_by>pr-review-toolkit:silent-failure-hunter</detected_by>
</capture>
